# fn-3-2fh.3 Create Inngest serve API route

## Description
Create Next.js API route to serve Inngest functions.

**Size:** S
**Files:**
- `apps/web/app/api/inngest/route.ts` (new)

## Approach

Follow Next.js App Router pattern from Inngest docs:
- Import `serve` from `inngest/next`
- Export GET, POST, PUT handlers
- Register functions array (empty initially, filled in Task 11)

Reference: `apps/web/app/api/health/route.ts` for route pattern

## Key context

- Route must export all three methods (GET, POST, PUT)
- Functions array will be populated when generate-message is built
- Add to middleware public routes if needed (check if Inngest needs unsigned access)
## Acceptance
- [ ] `/api/inngest` route created
- [ ] Exports GET, POST, PUT handlers
- [ ] Imports Inngest client from `@/lib/inngest`
- [ ] Functions array ready to receive generate-message function
- [ ] Route accessible at http://localhost:3000/api/inngest
- [ ] Inngest dev server can connect (`npx inngest-cli@latest dev`)
## Done summary
Created Inngest serve API route at /api/inngest with GET, POST, PUT handlers. The route imports the Inngest client and prepares an empty functions array for future generate-message function.
## Evidence
- Commits: 13c1708ba7c9089b82b6854d62037993a0ca9581
- Tests: pnpm test
- PRs: