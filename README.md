# Zbory

Zbory is a web application for electronic signing of OSBB (HOA) voting sheets.
The current repository contains MVP implementation (Stage 1) with mock-first integrations for local development.

## Project Status

- Status: active MVP development
- Primary locale: Ukrainian (`UA`)
- Architecture: Next.js App Router + Prisma + PostgreSQL

## MVP Scope

- SMS authentication (TurboSMS, mock in local dev)
- CRUD for `OSBB`, `Protocol` (with questions), `Owner`
- Sheet creation with PDF generation
- Public voting page: `/vote/[token]`
- Signing sequence: owner signs first, organizer signs second (Dubidoc)
- Dubidoc webhook-based status updates
- Downloads: original PDF, visualization PDF, signed `.p7s`

## Quick Start (Local)

Prerequisites:

- Node.js `v20`
- `pnpm`
- Docker (for PostgreSQL)

1. Prepare env and database:

```bash
cp .env.example .env.local
docker compose up -d
```

2. Install dependencies and prepare Prisma:

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
```

3. Run the app:

```bash
pnpm dev
```

Open `http://localhost:3000`.

Local development defaults to mock integrations when `DUBIDOC_*` / `TURBOSMS_*` values are empty or placeholder values.

## Quality Gates

Run before pushing changes:

```bash
pnpm check
pnpm build
```

## Documentation

- Local development and troubleshooting: [docs/local-dev.md](docs/local-dev.md)
- Integrations and runtime modes: [docs/integrations.md](docs/integrations.md)
- Vercel deployment guide: [docs/deploy-vercel.md](docs/deploy-vercel.md)
- Release process and versioning: [docs/release-policy.md](docs/release-policy.md)
- Release notes history: [CHANGELOG.md](CHANGELOG.md)
- Internal MCP PostgreSQL read-only setup: [docs/internal/mcp-postgres-ro.md](docs/internal/mcp-postgres-ro.md)

## Security

If you find a vulnerability, follow [SECURITY.md](SECURITY.md) and avoid posting exploit details in public issues.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

This repository is licensed under the GNU Affero General Public License v3.0 (`AGPL-3.0`).
See [LICENSE](LICENSE) for details.
