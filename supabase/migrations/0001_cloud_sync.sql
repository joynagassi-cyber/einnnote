-- ============================================================
-- Einnote Cloud — schéma de synchronisation
--
-- Principes :
--
-- 1. **Le paywall est dans la base, pas dans l’interface.** Une politique
--    RLS refuse toute écriture à un compte sans abonnement actif. Cacher un
--    bouton ne protège rien ; refuser l’INSERT, si.
-- 2. **Les droits ne sont pas modifiables par le client.** La table
--    `entitlements` n’a aucune politique d’écriture pour `authenticated` :
--    seul le service role (webhook Stripe) peut la changer.
-- 3. **Chaque ligne porte son estampille.** La fusion se fait côté client
--    (`src/lib/cloud/merge.ts`), le serveur ne fait qu’arbitrer le stockage —
--    il n’y a donc pas deux implémentations de la fusion à maintenir.
-- 4. **Les suppressions sont des lignes**, pas des oublis : sans cela une
--    note supprimée sur téléphone réapparaît depuis l’ordinateur.
-- ============================================================

-- Note : `gen_random_uuid()` est natif depuis PostgreSQL 13, donc aucune
-- extension à activer. Une dépendance en moins à expliquer dans six mois.
create schema if not exists engram;

-- ------------------------------------------------------------
-- Droits / abonnement
-- ------------------------------------------------------------
create table if not exists engram.entitlements (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free'
    check (plan in ('free', 'cloud')),
  status text not null default 'inactive'
    check (status in ('inactive', 'trialing', 'active', 'past_due', 'canceled')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table engram.entitlements is
  'Droits d’accès cloud. Écriture réservée au service role (webhook Stripe).';

-- ------------------------------------------------------------
-- Entités synchronisées
-- ------------------------------------------------------------
create table if not exists engram.entities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  collection text not null
    check (collection in (
      'projects', 'notes', 'questions', 'links', 'cards',
      'logs', 'vaults', 'zettel', 'mindmaps', 'progress'
    )),
  entity_id text not null,
  payload jsonb not null default '{}'::jsonb,
  stamp bigint not null default 0,
  deleted boolean not null default false,
  device_id text,
  updated_at timestamptz not null default now(),
  unique (owner_id, collection, entity_id)
);

create index if not exists entities_owner_collection_idx
  on engram.entities (owner_id, collection);
create index if not exists entities_owner_stamp_idx
  on engram.entities (owner_id, stamp desc);

comment on table engram.entities is
  'Une ligne par entité (note, carte, fiche…). `stamp` = ms epoch de la dernière modification.';

-- ------------------------------------------------------------
-- Appareils (diagnostic de synchronisation)
-- ------------------------------------------------------------
create table if not exists engram.devices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  device_key text not null,
  label text,
  last_seen_at timestamptz not null default now(),
  last_sync_at timestamptz,
  unique (owner_id, device_key)
);

-- ------------------------------------------------------------
-- Fonctions utilitaires
-- ------------------------------------------------------------

-- Abonnement cloud réellement actif ?
create or replace function engram.has_cloud_access(uid uuid)
returns boolean
language sql
security definer
set search_path = engram, public
stable
as $$
  select exists (
    select 1
      from engram.entitlements e
     where e.owner_id = uid
       and e.plan = 'cloud'
       and e.status in ('active', 'trialing')
       and (e.current_period_end is null or e.current_period_end > now())
  );
$$;

-- Liste des appareils connus
create or replace function public.touch_device(device_key text, label text default null)
returns void
language sql
security definer
set search_path = engram, public
as $$
  insert into engram.devices (owner_id, device_key, label, last_seen_at, last_sync_at)
  values (auth.uid(), device_key, label, now(), now())
  on conflict (owner_id, device_key)
  do update set last_seen_at = now(), last_sync_at = now(), label = coalesce(excluded.label, engram.devices.label);
$$;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table engram.entitlements enable row level security;
alter table engram.entities enable row level security;
alter table engram.devices enable row level security;

-- Lecture de ses propres droits (l’interface doit pouvoir afficher l’état).
drop policy if exists entitlements_select_own on engram.entitlements;
create policy entitlements_select_own on engram.entitlements
  for select to authenticated
  using (owner_id = auth.uid());

-- Aucune politique d’écriture sur entitlements : c’est volontaire.
-- Le client ne peut donc pas se donner un abonnement.

drop policy if exists entities_select_own on engram.entities;
create policy entities_select_own on engram.entities
  for select to authenticated
  using (owner_id = auth.uid());

drop policy if exists entities_insert_subscriber on engram.entities;
create policy entities_insert_subscriber on engram.entities
  for insert to authenticated
  with check (owner_id = auth.uid() and engram.has_cloud_access(auth.uid()));

drop policy if exists entities_update_subscriber on engram.entities;
create policy entities_update_subscriber on engram.entities
  for update to authenticated
  using (owner_id = auth.uid() and engram.has_cloud_access(auth.uid()))
  with check (owner_id = auth.uid() and engram.has_cloud_access(auth.uid()));

drop policy if exists entities_delete_subscriber on engram.entities;
create policy entities_delete_subscriber on engram.entities
  for delete to authenticated
  using (owner_id = auth.uid() and engram.has_cloud_access(auth.uid()));

drop policy if exists devices_own on engram.devices;
create policy devices_own on engram.devices
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and engram.has_cloud_access(auth.uid()));

-- ------------------------------------------------------------
-- API client : tout ce que l’application appelle vit dans `public`.
--
-- Raison : PostgREST n’expose que les schémas déclarés. Y ajouter `engram`
-- exposerait aussi les tables (protégées par RLS, mais c’est une surface de
-- plus). Cinq fonctions `security definer` offrent exactement l’interface
-- nécessaire — ni plus, ni moins.
-- ------------------------------------------------------------
-- Fusion par lot, côté base
--
-- Le client envoie un lot de lignes ; le serveur n’accepte une ligne que si
-- son estampille est plus récente que celle déjà stockée. Deux appareils qui
-- poussent en même temps ne peuvent donc pas se détruire mutuellement : la
-- ligne la plus ancienne est ignorée, pas écrasée.
-- ------------------------------------------------------------
create or replace function public.push_entities(rows jsonb, device_key text default null)
returns jsonb
language plpgsql
security definer
set search_path = engram, public
as $$
declare
  uid uuid := auth.uid();
  accepted int := 0;
  skipped int := 0;
  row_data jsonb;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if not engram.has_cloud_access(uid) then
    raise exception 'subscription required' using errcode = '42501';
  end if;

  for row_data in select * from jsonb_array_elements(rows) loop
    insert into engram.entities
      (owner_id, collection, entity_id, payload, stamp, deleted, device_id, updated_at)
    values (
      uid,
      row_data->>'collection',
      row_data->>'entity_id',
      coalesce(row_data->'payload', '{}'::jsonb),
      coalesce((row_data->>'stamp')::bigint, 0),
      coalesce((row_data->>'deleted')::boolean, false),
      device_key,
      now()
    )
    on conflict (owner_id, collection, entity_id) do update
      set payload = excluded.payload,
          stamp = excluded.stamp,
          deleted = excluded.deleted,
          device_id = excluded.device_id,
          updated_at = now()
      where engram.entities.stamp < excluded.stamp;

    if found then
      accepted := accepted + 1;
    else
      skipped := skipped + 1;
    end if;
  end loop;

  return jsonb_build_object('accepted', accepted, 'skipped', skipped);
end;
$$;

revoke all on function public.push_entities(jsonb, text) from public;
grant execute on function public.push_entities(jsonb, text) to authenticated;

revoke all on function public.touch_device(text, text) from public;
grant execute on function public.touch_device(text, text) to authenticated;

-- ------------------------------------------------------------
-- Suppression totale des données cloud (droit à l’effacement)
-- ------------------------------------------------------------
create or replace function public.wipe_cloud_data()
returns void
language sql
security definer
set search_path = engram, public
as $$
  delete from engram.entities where owner_id = auth.uid();
  delete from engram.devices where owner_id = auth.uid();
$$;

grant execute on function public.wipe_cloud_data() to authenticated;

-- ------------------------------------------------------------
-- Lecture : on passe par des fonctions plutôt que par l’exposition du
-- schéma `engram` à PostgREST. Un schéma exposé, c’est une surface d’API
-- publique de plus à raisonner ; trois fonctions suffisent.
--
-- La lecture reste autorisée même sans abonnement : si l’abonnement s’arrête,
-- on veut pouvoir récupérer ses données. C’est l’écriture qui est payante.
-- ------------------------------------------------------------
create or replace function public.pull_entities(since_ms bigint default 0)
returns jsonb
language sql
security definer
set search_path = engram, public
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'collection', e.collection,
        'entity_id', e.entity_id,
        'payload', e.payload,
        'stamp', e.stamp,
        'deleted', e.deleted,
        'updated_at', e.updated_at
      )
      order by e.collection, e.entity_id
    ),
    '[]'::jsonb
  )
  from engram.entities e
  where e.owner_id = auth.uid()
    and e.stamp >= since_ms;
$$;

revoke all on function public.pull_entities(bigint) from public;
grant execute on function public.pull_entities(bigint) to authenticated;

-- État d’abonnement vu par le client (lecture seule, jamais la clé Stripe).
create or replace function public.my_entitlement()
returns jsonb
language sql
security definer
set search_path = engram, public
stable
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'plan', e.plan,
        'status', e.status,
        'current_period_end', e.current_period_end,
        'active', (
          e.plan = 'cloud'
          and e.status in ('active', 'trialing')
          and (e.current_period_end is null or e.current_period_end > now())
        )
      )
      from engram.entitlements e
      where e.owner_id = auth.uid()
    ),
    jsonb_build_object('plan', 'free', 'status', 'inactive', 'active', false)
  );
$$;

revoke all on function public.my_entitlement() from public;
grant execute on function public.my_entitlement() to authenticated;

-- Appareils connus du compte : sert à expliquer d’où vient une modification.
create or replace function public.list_devices()
returns jsonb
language sql
security definer
set search_path = engram, public
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'device_key', d.device_key,
        'label', d.label,
        'last_seen_at', d.last_seen_at,
        'last_sync_at', d.last_sync_at
      )
      order by d.last_seen_at desc
    ),
    '[]'::jsonb
  )
  from engram.devices d
  where d.owner_id = auth.uid();
$$;

revoke all on function public.list_devices() from public;
grant execute on function public.list_devices() to authenticated;
