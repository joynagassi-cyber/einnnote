# Cloud Einnote — architecture, coûts, mise en service

> État réel, pas une intention : **le backend est déployé.** Projet Supabase
> `Einnote` (`bqgyzwjlouuohmqscnwu`, `eu-west-2`) créé le 28 octobre 2026, schéma
> `engram` appliqué, six fonctions `security definer` en place, RLS active sur
> les trois tables, et les deux Edge Functions Deno `stripe-checkout` /
> `stripe-webhook` déployées (§5). Ce qui **reste à faire** tient en deux
> secrets Stripe — voir §8.

---

## 1. Pourquoi un backend, et pourquoi pas un simple « sauvegarde JSON »

L’application est locale par choix, et ce choix ne se négocie pas : sans
réseau, sans compte, tout fonctionne. La synchronisation ne remplace donc pas
le stockage local — elle le **prolonge**. Trois conséquences de conception :

| Décision | Ce qu’on évite |
|---|---|
| Une **ligne par entité** (note, carte, fiche…) au lieu d’un blob JSON | Le blob impose « dernier appareil qui écrit gagne » : ouvrir l’ordinateur après avoir écrit sur le téléphone efface le travail du téléphone, sans avertissement. |
| Une **estampille par entité** (`stamp`, ms epoch) | Sans horodatage, impossible de savoir laquelle des deux copies est la plus récente — donc on devine, donc on perd. |
| Des **tombes** pour les suppressions | Une suppression n’est pas un événement observable dans un store qui retire simplement un élément du tableau. Sans tombe, la note supprimée sur téléphone revient depuis l’ordinateur à la synchro suivante. |

La fusion vit côté client, dans `src/lib/cloud/merge.ts` : **code pur**, sans
réseau, sans store, sans Supabase. Elle est testée (34 assertions) et les mêmes
règles sont réappliquées par la base au moment de l’écriture (§3, LWW). Deux
implémentations, mais pas deux logiques : le serveur arbitre un ordre, il ne
réécrit pas un contenu.

---

## 2. Ce que voit l’utilisateur

- **Sans variable d’environnement** : l’écran `/settings/cloud` affiche « Aucun
  serveur associé » et les commandes de mise en service. Aucun bouton de
  paiement, aucun SDK chargé (`@supabase/supabase-js` est en `import()`
  dynamique). L’application reste exactement ce qu’elle était.
- **Connecté, sans abonnement** : lecture autorisée, écriture refusée par la
  base. Le bouton « Synchroniser » est désactivé et explique pourquoi.
- **Abonné** : synchro manuelle, ou automatique 4 s après la dernière
  modification ; rapport d’échange (reçus / envoyés / supprimés / conflits) ;
  liste des appareils ; suppression des données cloud séparée de la
  déconnexion.

---

## 3. Le paywall, et pourquoi il tient

Trois couches, une seule décide :

1. **L’interface** cache les commandes — confort, jamais sécurité.
2. **La base** : `public.push_entities()` lève `42501 subscription required`
   sans droit actif. Les politiques RLS d’écriture sur `engram.entities`
   exigent aussi `engram.has_cloud_access(auth.uid())` — ceinture et
   bretelles, pour que la table reste fermée même si une fonction était
   ajoutée un jour sans garde.
3. **Les droits ne sont pas écrivables par le client.** `engram.entitlements`
   n’a **aucune** politique d’écriture : seule la clé service role, utilisée
   par le webhook Stripe, peut accorder quoi que ce soit. Vérifié
   explicitement : un `update` en tant qu’utilisateur authentifié touche
   **0 ligne**.

`has_cloud_access` exige `plan = 'cloud'`, un statut `active` ou `trialing`,
**et** `current_period_end > now()`. Un abonnement expiré ferme l’écriture dès
la seconde suivante, même si Stripe n’a pas encore envoyé d’événement — le
webhook n’est pas un point de défaillance unique.

---

## 4. Schéma

```
engram.entitlements  (owner_id PK, plan, status, period_end, stripe_*)
engram.entities      (owner_id, collection, entity_id, payload jsonb, stamp bigint,
                      deleted bool, device_id)  unique(owner_id, collection, entity_id)
engram.devices       (owner_id, device_key, label, last_seen_at, sync_at)
```

API client, cinq fonctions `security definer` dans `public` (`push_entities`,
`pull_entities`, `my_entitlement`, `list_devices`, `wipe_cloud_data`,
`touch_device`) :

- le schéma `engram` **n’est pas exposé** à PostgREST — les tables sont
  inaccessibles en direct, ce que la vérification confirme
  (`permission denied for schema engram`) ;
- surface d’API minimale : on ne peut appeler que ce qui est prévu ;
- `security definer` + `search_path` figé + `revoke all from public`.

Collections synchronisées : projets, notes, questions, liaisons, cartes,
journal de révision, vaults, zettelkasten, canevas, progression.

**Non synchronisé, volontairement** : apparence, densité, réglages de révision,
thème. Ce sont des préférences d’appareil — un téléphone et un écran large n’ont
pas les mêmes contraintes, et écraser l’affichage du téléphone depuis le bureau
est une nuisance, pas une fonctionnalité.

---

## 5. Mise en service — état réel

**Déjà fait** sur le projet `Einnote` (`bqgyzwjlouuohmqscnwu`) :

| Élément | État |
|---|---|
| Schéma `engram` (3 tables, RLS, index) | appliqué |
| `push_entities`, `pull_entities`, `my_entitlement`, `list_devices`, `touch_device`, `wipe_cloud_data` | créées, `security definer`, `execute` réservé à `authenticated` |
| `engram.entitlements` | RLS active, **aucune** politique d’écriture |
| Edge Function `stripe-checkout` (JWT vérifié) | déployée, version 1 |
| Edge Function `stripe-webhook` (JWT ouvert, signature Stripe) | déployée, version 1 |

**Reste à faire, côté Stripe** — sans ces valeurs, le paiement répond
`503 « Paiement non configuré sur ce serveur »`, proprement, et l’application
reste locale :

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_live_… \
  STRIPE_PRICE_ID=price_… \
  STRIPE_WEBHOOK_SECRET=whsec_… \
  APP_URL=https://votre-domaine
```

Les fonctions se redéploient ensuite avec `supabase functions deploy <slug>`
(`--no-verify-jwt` pour `stripe-webhook` uniquement).

Puis, côté Stripe : créer le prix récurrent **10 $ / mois**, et pointer le
webhook vers `https://<ref>.supabase.co/functions/v1/stripe-webhook` avec les
événements `checkout.session.completed`, `customer.subscription.created`,
`customer.subscription.updated`, `customer.subscription.deleted`,
`invoice.payment_failed`.

Côté application, `.env.local` :

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ…      # clé publique : seules les RLS décident
```

Authentification : code à 6 chiffres envoyé par courriel (`signInWithOtp` +
`verifyOtp`), sans mot de passe. Modèle d’e-mail à personnaliser dans le
tableau de bord Supabase (le modèle par défaut renvoie un lien ; `{{ .Token }}`
donne le code).

---

## 6. Vérification effectuée

`supabase/verify/verify_migration.py` applique la migration **telle quelle** sur
un PostgreSQL embarqué, avec le minimum de l’environnement Supabase
(`auth.users`, `auth.uid()`, rôle `authenticated`), et exerce les fonctions
comme le client. Résultat : **14 vérifications, toutes vertes.**

```
Paywall
  ✓ refus sans abonnement
  ✓ refus si la période est échue
  ✓ auto-octroi impossible
Synchronisation (abonné)
  ✓ premier envoi accepté
  ✓ envoi périmé ignoré (LWW serveur)
  ✓ la version la plus récente gagne
  ✓ la tombe est conservée côté serveur
  ✓ état d’abonnement lisible
  ✓ appareil enregistré
  ✓ tables inaccessibles en direct (schéma fermé)
  ✓ effacement complet
Isolation entre comptes
  ✓ aucune donnée d’un autre compte
  ✓ lecture possible après résiliation
  ✓ écriture refusée après résiliation
```

Sur le projet hébergé, la migration a été appliquée le 28 octobre 2026 et
vérifiée par introspection : trois tables avec `relrowsecurity = true`
(`entitlements` 1 politique, `entities` 4, `devices` 1) et sept fonctions
`security definer` présentes dans `pg_proc`.

Ce qui **reste non vérifié** : les deux Edge Functions Deno (`stripe-checkout`,
`stripe-webhook`) n’ont jamais été exécutées — elles demandent un compte Stripe
et un projet déployé. Leur contrat d’entrée/sortie est lisible et minimal, mais
« écrit avec soin » n’est pas « exécuté ».

Défaut connu : `stripe-webhook` ne dédoublonne pas les événements rejoués.
Stripe peut livrer deux fois ; ici l’écriture est un `upsert` idempotent, donc
le résultat est le même — mais si un jour une action non idempotente est
ajoutée (courriel de bienvenue), il faudra une table `processed_events`.

---

### Tester la synchronisation avant d’avoir Stripe

L’écriture est refusée sans abonnement — c’est le point de conception, pas un
bug. Pour éprouver la synchro de bout en bout sur son propre compte, on ouvre
soi-même le droit, en SQL, avec le rôle `service_role` (jamais depuis le
client) :

```sql
insert into engram.entitlements (owner_id, plan, status, current_period_end)
values ('<uuid de auth.users>', 'cloud', 'active', now() + interval '30 days')
on conflict (owner_id) do update
  set plan = 'cloud', status = 'active', current_period_end = excluded.current_period_end;
```

Puis, côté application : `/settings/cloud` → connexion par code → « Synchroniser ».
Vérifier ensuite dans le tableau de bord que `engram.entities` se remplit, et
que deux appareils convergent. `delete from engram.entitlements where owner_id = …`
remet le compte en gratuit, et la synchro doit alors refuser d’écrire en le
disant.

---

## 7. Économie du produit à 10 $/mois

| Poste | Montant |
|---|---|
| Prix | 10,00 $ |
| Frais Stripe (2,9 % + 0,30 $) | −0,59 $ |
| **Net par abonné** | **9,41 $** |
| Supabase Pro | 25 $/mois |
| Nommage de domaine | ~1 $/mois |
| **Seuil de rentabilité** | **3 abonnés** (28,23 $ > 26 $) |

À 100 abonnés : ~941 $ de revenu net, ~27 $ de coûts fixes, soit ~914 $ de
marge. Le coût marginal par utilisateur est négligeable : une note pèse
quelques kilooctets, et le plan Pro inclut 8 Go et 100 000 utilisateurs actifs.

Trois remarques honnêtes :

- **Le plan gratuit suffit pour commencer.** Il faut un projet Supabase payant
  uniquement si l’on veut deux projets, ou au-delà des quotas — d’où la
  possibilité de tester à 0 $ avant de facturer.
- **Le prix se défend par la promesse, pas par le coût.** Ce qui est vendu est
  la continuité entre appareils et la tranquillité de ne rien perdre ; le coût
  réel, lui, est de 0,02 $ par abonné.
- **10 $ est cher pour un carnet de notes, et c’est assumé** : la cible est
  quelqu’un qui étudie sérieusement (révision espacée, Cornell, zettelkasten)
  et qui veut retrouver son travail partout. Un prix bas attirerait une
  audience qui n’utilise pas la fonction payante et augmenterait le taux de
  résiliation.

---

## 8. Ce qui reste ouvert

Le blocage de la session précédente — quota de projets gratuits atteint — est
levé : le projet `Einnote` existe et le schéma est appliqué. Trois points
restent ouverts, et ils sont nommés plutôt que masqués :

1. **Aucun compte Stripe n’est branché.** Les deux fonctions tournent, mais la
   création de session renvoie `503` et le webhook refuse faute de
   `STRIPE_WEBHOOK_SECRET`. Conséquence assumée : **personne ne peut
   s’abonner**, donc personne ne peut écrire dans le cloud. Le paywall est
   cohérent jusque-là ; il ne devient commercial qu’avec ces trois secrets.
2. **Les Edge Functions n’ont jamais traité un vrai paiement.** Leur contrat
   est lisible et minimal, leur démarrage sans secret est testé (503, pas 500),
   mais « écrit avec soin » n’est pas « exécuté ». Défaut connu :
   `stripe-webhook` ne dédoublonne pas les événements rejoués — l’écriture
   étant un `upsert` idempotent, le résultat est le même aujourd’hui, mais une
   action non idempotente future demandera une table `processed_events`.
3. **Le code e-mail du serveur fait 8 chiffres** (réglage Supabase par défaut
   de ce projet), alors que le client supposait 6. Corrigé côté client : la
   longueur acceptée va de 6 à 10 chiffres, puisque c’est un réglage serveur et
   non une propriété du produit.

---

## 9. Fichiers

| Chemin | Rôle |
|---|---|
| `supabase/migrations/0001_cloud_sync.sql` | schéma, RLS, fonctions, LWW serveur |
| `supabase/functions/stripe-checkout/index.ts` | création de la session de paiement |
| `supabase/functions/stripe-webhook/index.ts` | seule écriture des droits |
| `supabase/verify/verify_migration.py` | vérification sur PostgreSQL réel |
| `.env.local` (non versionné) | URL + clé publique du projet `Einnote` |
| `src/lib/cloud/types.ts` | modèle de synchronisation |
| `src/lib/cloud/merge.ts` | fusion pure local ↔ distant |
| `src/lib/cloud/state.ts` | tombes déduites, état persistant, `known` |
| `src/lib/cloud/sync.ts` | orchestration (tirage, fusion, envoi, rapport) |
| `src/lib/cloud/auth.ts` | connexion par code à 6 chiffres |
| `src/lib/cloud/client.ts` | client Supabase chargé à la demande |
| `src/pages/CloudSettings.tsx` | écran `/settings/cloud` |
| `src/components/CloudBridge.tsx` | synchro au démarrage et après édition |
