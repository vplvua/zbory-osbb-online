# Release Policy

## Scope

This policy defines how `zbory` versions, releases, and changelog updates are managed.

## Versioning Standard

- We use Semantic Versioning: `MAJOR.MINOR.PATCH`.
- During MVP, versions stay in `0.x.y`.
- `1.0.0` is used when MVP is stable for production usage and core workflows are complete.

## Version Bump Rules

- `PATCH`:
  - Bug fixes without public contract changes.
  - Internal refactors with no behavioral change for API/UI flows.
- `MINOR`:
  - Backward-compatible features (new pages, optional fields, new endpoints that do not break existing clients).
  - Non-breaking schema extensions (new tables/columns nullable or with safe defaults).
- `MAJOR`:
  - Breaking API/request/response changes.
  - Breaking webhook payload changes.
  - Breaking PDF format/template changes that invalidate existing automation or downstream consumers.
  - Breaking DB migration assumptions that require manual intervention for existing environments.

## What Is a Breaking Change in This Project

Changes are treated as breaking if they impact any of the following:

- Public vote flow contracts (`/api/vote/[token]`, validation rules, required fields).
- Dubidoc webhook payload handling.
- `SheetStatus` or consent status semantics used by UI/API integrations.
- Download contracts for original/visualization/signed files.
- Prisma migrations that cannot be applied safely on existing data without operator steps.

## Release Cadence

- Default: release on demand after merged and validated changes.
- Group small fixes/features when possible to reduce release overhead.

## Release Branch/Tag Convention

- Primary branch: `main`.
- Release tag format: `vX.Y.Z` (example: `v0.2.3`).
- No release without a matching changelog entry.

## Release Checklist

1. Ensure `CHANGELOG.md` has updates in `Unreleased`.
2. Run quality gates:
   - `pnpm check`
   - `pnpm build`
3. Bump version in `package.json`.
4. Move `Unreleased` notes into a new section `## [X.Y.Z] - YYYY-MM-DD`.
5. Commit:
   - `chore(release): vX.Y.Z`
6. Create annotated tag:
   - `git tag -a vX.Y.Z -m "Release vX.Y.Z"`
7. Push commit and tag:
   - `git push origin main --follow-tags`

## Hotfix Process

- Branch from the latest release tag.
- Apply minimal fix.
- Run `pnpm check` and `pnpm build`.
- Release as `PATCH` version.
- Merge hotfix back to `main`.

## Pre-release Versions (Optional)

Use SemVer pre-release labels for staged validation:

- `X.Y.Z-rc.1`, `X.Y.Z-rc.2` for release candidates.
- Do not mark pre-release versions as stable in deployment docs.

## Database Migration Guidance

- Every release including schema changes must include Prisma migration files.
- Avoid destructive migration patterns in normal releases.
- If manual operator actions are required, document them in:
  - release notes (`CHANGELOG.md`)
  - deployment guide (`docs/deploy-vercel.md`)

## Changelog Requirement

- `CHANGELOG.md` is required for every release.
- Keep entries concise and user-impact focused.
- Prefer sections: `Added`, `Changed`, `Fixed`, `Security`.
