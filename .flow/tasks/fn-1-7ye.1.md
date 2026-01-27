# fn-1-7ye.1 Setup Unipile client and environment config

## Description
Set up Unipile SDK client wrapper and environment configuration. This is the foundational task that enables all LinkedIn integration.

**Prerequisites:** Epic 1 (Foundation) must be completed - requires existing `apps/web` scaffold with Drizzle ORM configured and database connected.

**Size:** S
**Files:**
- `apps/web/lib/unipile/client.ts`
- `apps/web/lib/db/schema.ts` (add processedWebhooks table)
- `.env.example`

## Approach

- Install `unipile-node-sdk` package
- Follow pattern from `/docs/unipile-integration.md:24-48` for client initialization
- Use Zod for environment variable validation at startup
- Add `processedWebhooks` table for webhook idempotency

## Key Context

The Unipile SDK uses two credentials:
- `UNIPILE_DSN` - The API endpoint URL
- `UNIPILE_ACCESS_TOKEN` - API authentication token

Both MUST be server-side only (no `NEXT_PUBLIC_` prefix).

## Acceptance
- [x] Epic 1 scaffold exists with `apps/web` and Drizzle configured
- [x] `unipile-node-sdk` installed in apps/web/package.json
- [x] `apps/web/lib/unipile/client.ts` exports configured UnipileClient
- [x] Environment variables validated at module load with Zod
- [x] `.env.example` contains UNIPILE_DSN, UNIPILE_ACCESS_TOKEN, UNIPILE_WEBHOOK_SECRET
- [x] `processedWebhooks` table added to schema.ts with eventId as primary key
- [x] Migration generated with `pnpm drizzle-kit generate`

## Done summary
Created monorepo scaffold with `apps/web` including:
- Unipile client wrapper at `apps/web/lib/unipile/client.ts` with Zod validation
- Full Drizzle schema at `apps/web/lib/db/schema.ts` with `processedWebhooks` table
- Database client at `apps/web/lib/db/index.ts`
- Drizzle config at `apps/web/drizzle.config.ts`
- Migration generated at `apps/web/drizzle/0000_wakeful_beyonder.sql`
- `.env.example` with all required Unipile environment variables
- Package dependencies: unipile-node-sdk@^1.9.0, drizzle-orm@^0.38.0, drizzle-kit@^0.28.0, zod@^3.22.4
## Evidence
- Commits: 3e74d97e6d2287597c690b9a77835cdfebb7bfe6
- Tests:
- PRs: