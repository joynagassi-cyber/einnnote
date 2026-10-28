"""
Vérification réelle de la migration cloud contre un PostgreSQL embarqué.

Ce script n’est pas un test unitaire : il applique la migration telle quelle
sur un vrai serveur, avec le strict minimum de l’environnement Supabase
(`auth.users`, `auth.uid()`, rôle `authenticated`), puis exerce les fonctions
comme le ferait le client — et vérifie surtout que **le paywall tient** quand on
essaie de le contourner.

Exécution (hors dépôt, dépendances hors production) :
    python3 -m venv /tmp/sqlvenv
    /tmp/sqlvenv/bin/pip install pgserver "psycopg[binary]"
    /tmp/sqlvenv/bin/python supabase/verify/verify_migration.py
"""

from __future__ import annotations

import sys
import uuid
from pathlib import Path

import pgserver
import psycopg

ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / "supabase" / "migrations" / "0001_cloud_sync.sql"

BOOTSTRAP = """
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key,
  email text unique
);

-- Supabase : le JWT arrive dans un réglage de session.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create role authenticated nologin;
"""

failures: list[str] = []


def check(label: str, condition: bool, detail: str = "") -> None:
    if condition:
        print(f"  ✓ {label}")
    else:
        failures.append(label)
        print(f"  ✗ {label} {detail}")


def as_user(conn: psycopg.Connection, user_id: uuid.UUID) -> None:
    conn.execute("set local role authenticated")
    conn.execute("select set_config('request.jwt.claim.sub', %s, true)", (str(user_id),))


def main() -> int:
    server = pgserver.get_server("/tmp/engram-pg")
    dsn = server.get_uri()

    with psycopg.connect(dsn, autocommit=True) as root:
        # `gen_random_uuid()` est natif depuis PostgreSQL 13 : aucune extension
        # à installer, ni sur Supabase ni ici.
        root.execute(BOOTSTRAP)
        root.execute(MIGRATION.read_text())
        print("\nMigration appliquée sur PostgreSQL réel.\n")

        alice, bob = uuid.uuid4(), uuid.uuid4()
        root.execute(
            "insert into auth.users (id, email) values (%s, %s), (%s, %s)",
            (alice, "alice@example.com", bob, "bob@example.com"),
        )

        row = (
            '{"collection":"notes","entity_id":"n1",'
            '"payload":{"id":"n1","title":"Première","updatedAt":"2026-01-01T00:00:00Z"},'
            '"stamp":1000,"deleted":false}'
        )

        # ---------------------------------------------------------- paywall
        print("Paywall")
        with psycopg.connect(dsn) as conn:
            conn.execute("begin")
            as_user(conn, alice)
            try:
                conn.execute("select public.push_entities(%s::jsonb, 'dev-a')", (f"[{row}]",))
                check("refus sans abonnement", False, "l’appel aurait dû lever")
            except psycopg.errors.InsufficientPrivilege as error:
                check("refus sans abonnement", "subscription required" in str(error))
            conn.rollback()

        # Un abonnement expiré ne doit rien ouvrir.
        root.execute(
            """insert into engram.entitlements (owner_id, plan, status, current_period_end)
               values (%s, 'cloud', 'active', now() - interval '1 day')""",
            (alice,),
        )
        with psycopg.connect(dsn) as conn:
            conn.execute("begin")
            as_user(conn, alice)
            try:
                conn.execute("select public.push_entities(%s::jsonb, 'dev-a')", (f"[{row}]",))
                check("refus si la période est échue", False, "l’appel aurait dû lever")
            except psycopg.errors.InsufficientPrivilege:
                check("refus si la période est échue", True)
            conn.rollback()

        # Le client ne peut pas s’octroyer un abonnement : aucune politique
        # d’écriture sur entitlements.
        with psycopg.connect(dsn) as conn:
            conn.execute("begin")
            as_user(conn, alice)
            try:
                conn.execute(
                    """update engram.entitlements set status = 'active',
                       current_period_end = now() + interval '30 days'
                       where owner_id = %s""",
                    (alice,),
                )
                moved = conn.execute(
                    "select count(*) from engram.entitlements where owner_id = %s", (alice,)
                ).fetchone()[0]
                check("auto-octroi impossible", moved == 0, f"{moved} ligne(s) modifiée(s)")
            except psycopg.Error:
                check("auto-octroi impossible", True)
            conn.rollback()

        # -------------------------------------------------- abonnement actif
        root.execute(
            """update engram.entitlements
                  set current_period_end = now() + interval '30 days'
                where owner_id = %s""",
            (alice,),
        )
        print("\nSynchronisation (abonné)")
        with psycopg.connect(dsn) as conn:
            conn.execute("begin")
            as_user(conn, alice)
            ack = conn.execute(
                "select public.push_entities(%s::jsonb, 'dev-a')", (f"[{row}]",)
            ).fetchone()[0]
            check("premier envoi accepté", ack == {"accepted": 1, "skipped": 0}, str(ack))

            stale = row.replace('"stamp":1000', '"stamp":500').replace("Première", "Ancienne")
            ack = conn.execute(
                "select public.push_entities(%s::jsonb, 'dev-a')", (f"[{stale}]",)
            ).fetchone()[0]
            check("envoi périmé ignoré (LWW serveur)", ack == {"accepted": 0, "skipped": 1}, str(ack))

            fresh = row.replace('"stamp":1000', '"stamp":2000').replace("Première", "À jour")
            conn.execute("select public.push_entities(%s::jsonb, 'dev-a')", (f"[{fresh}]",))

            pulled = conn.execute("select public.pull_entities(0)").fetchone()[0]
            titles = [r["payload"]["title"] for r in pulled]
            check("la version la plus récente gagne", titles == ["À jour"], str(titles))

            tomb = (
                '{"collection":"notes","entity_id":"n1","payload":{},'
                '"stamp":3000,"deleted":true}'
            )
            conn.execute("select public.push_entities(%s::jsonb, 'dev-a')", (f"[{tomb}]",))
            pulled = conn.execute("select public.pull_entities(0)").fetchone()[0]
            check("la tombe est conservée côté serveur", pulled[0]["deleted"] is True)

            ent = conn.execute("select public.my_entitlement()").fetchone()[0]
            check("état d’abonnement lisible", ent["active"] is True and ent["plan"] == "cloud", str(ent))

            conn.execute("select public.touch_device('dev-a', 'Ordinateur')")
            devices = conn.execute("select public.list_devices()").fetchone()[0]
            check("appareil enregistré", len(devices) == 1 and devices[0]["label"] == "Ordinateur")

            conn.execute("savepoint probe")
            try:
                conn.execute("select count(*) from engram.entities")
                check("tables inaccessibles en direct (schéma fermé)", False)
            except psycopg.errors.InsufficientPrivilege:
                conn.execute("rollback to savepoint probe")
                check("tables inaccessibles en direct (schéma fermé)", True)

            conn.execute("select public.wipe_cloud_data()")
            conn.execute("commit")

        left = root.execute("select count(*) from engram.entities").fetchone()[0]
        check("effacement complet", left == 0, f"{left} ligne(s) restante(s)")

        # ------------------------------------------------------- isolation
        print("\nIsolation entre comptes")
        root.execute(
            """insert into engram.entitlements (owner_id, plan, status, current_period_end)
               values (%s, 'cloud', 'active', now() + interval '30 days')
               on conflict (owner_id) do nothing""",
            (bob,),
        )
        with psycopg.connect(dsn) as conn:
            conn.execute("begin")
            as_user(conn, bob)
            conn.execute("select public.push_entities(%s::jsonb, 'dev-b')", (f"[{row}]",))
            conn.execute("commit")

        with psycopg.connect(dsn) as conn:
            conn.execute("begin")
            as_user(conn, alice)
            seen = conn.execute("select public.pull_entities(0)").fetchone()[0]
            check("aucune donnée d’un autre compte", seen == [], str(seen))
            conn.rollback()

        # Un utilisateur non abonné lit ses propres données sans pouvoir écrire.
        root.execute(
            "update engram.entitlements set current_period_end = now() - interval '1 day' where owner_id = %s",
            (bob,),
        )
        with psycopg.connect(dsn) as conn:
            conn.execute("begin")
            as_user(conn, bob)
            readable = conn.execute("select public.pull_entities(0)").fetchone()[0]
            check("lecture possible après résiliation", len(readable) == 1, str(len(readable)))
            try:
                conn.execute("select public.push_entities('[]'::jsonb, 'dev-b')")
                check("écriture refusée après résiliation", False)
            except psycopg.errors.InsufficientPrivilege:
                check("écriture refusée après résiliation", True)
            conn.rollback()

    print()
    if failures:
        print(f"ÉCHECS ({len(failures)}) : " + ", ".join(failures))
        return 1
    print("Tout est vérifié sur un vrai PostgreSQL.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
