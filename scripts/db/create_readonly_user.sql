\set ON_ERROR_STOP on

-- Usage example:
-- docker compose exec -T db psql -U postgres -d zbory_dev \
--   -v ro_user='zbory_ro' \
--   -v ro_password='REPLACE_WITH_STRONG_PASSWORD' \
--   -v db_name='zbory_dev' \
--   -v schema_name='public' \
--   -v migrator_role='postgres' \
--   -f /dev/stdin < scripts/db/create_readonly_user.sql

\if :{?ro_user}
\else
\set ro_user zbory_ro
\endif

\if :{?ro_password}
\else
\set ro_password CHANGE_ME_STRONG_PASSWORD
\endif

\if :{?db_name}
\else
\set db_name zbory_dev
\endif

\if :{?schema_name}
\else
\set schema_name public
\endif

\if :{?migrator_role}
\else
\set migrator_role postgres
\endif

SELECT EXISTS (
  SELECT 1
  FROM pg_roles
  WHERE rolname = :'ro_user'
) AS ro_exists \gset

\if :ro_exists
SELECT format(
  'ALTER ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION',
  :'ro_user',
  :'ro_password'
) AS sql_to_run \gexec
\else
SELECT format(
  'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION',
  :'ro_user',
  :'ro_password'
) AS sql_to_run \gexec
\endif

GRANT CONNECT ON DATABASE :"db_name" TO :"ro_user";
GRANT USAGE ON SCHEMA :"schema_name" TO :"ro_user";
GRANT SELECT ON ALL TABLES IN SCHEMA :"schema_name" TO :"ro_user";
GRANT SELECT ON ALL SEQUENCES IN SCHEMA :"schema_name" TO :"ro_user";

ALTER DEFAULT PRIVILEGES FOR ROLE :"migrator_role" IN SCHEMA :"schema_name"
  GRANT SELECT ON TABLES TO :"ro_user";
ALTER DEFAULT PRIVILEGES FOR ROLE :"migrator_role" IN SCHEMA :"schema_name"
  GRANT SELECT ON SEQUENCES TO :"ro_user";

REVOKE CREATE ON SCHEMA :"schema_name" FROM :"ro_user";
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON ALL TABLES IN SCHEMA :"schema_name" FROM :"ro_user";
REVOKE USAGE, UPDATE ON ALL SEQUENCES IN SCHEMA :"schema_name" FROM :"ro_user";
