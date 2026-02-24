# MCP PostgreSQL Read-Only User (Internal)

This guide is for local/internal tooling setup (Codex MCP server).

## Create / Update Read-Only User

```bash
docker compose exec -T db psql -U postgres -d zbory_dev \
  -v ro_user='zbory_ro' \
  -v ro_password='REPLACE_WITH_STRONG_PASSWORD' \
  -v db_name='zbory_dev' \
  -v schema_name='public' \
  -v migrator_role='postgres' \
  -f /dev/stdin < scripts/db/create_readonly_user.sql
```

If migrations are applied by another role, pass it via `-v migrator_role='your_role'`.

## Verify Read-Only Behavior

```bash
docker compose exec db psql "postgresql://zbory_ro:REPLACE_WITH_STRONG_PASSWORD@localhost:5432/zbory_dev" -c "SELECT now();"
docker compose exec db psql "postgresql://zbory_ro:REPLACE_WITH_STRONG_PASSWORD@localhost:5432/zbory_dev" -c "CREATE TABLE _deny_test(id int);"
```

Expected:

- first command succeeds
- second command fails with `permission denied`

## Codex MCP Config Example

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.postgres_ro]
command = "npx"
args = [
  "-y",
  "@modelcontextprotocol/server-postgres",
  "postgresql://zbory_ro:REPLACE_WITH_STRONG_PASSWORD@localhost:5432/zbory_dev?schema=public"
]
```
