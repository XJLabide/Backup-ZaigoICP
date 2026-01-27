# fn-3-2fh.1 Install AI and Inngest dependencies

## Description
Install AI SDK and Inngest packages required for message generation and background jobs.

**Size:** S
**Files:**
- `apps/web/package.json`
- `pnpm-lock.yaml`

## Approach

Add packages via pnpm:
```bash
pnpm add ai @ai-sdk/anthropic inngest --filter @repo/web
```

## Key context

- Vercel AI SDK v6 uses `ai` as core package + provider packages
- `@ai-sdk/anthropic` provides Claude models
- Inngest SDK is `inngest` (not `@inngest/sdk`)
## Acceptance
- [ ] `ai` package installed (version ^4.x or latest)
- [ ] `@ai-sdk/anthropic` package installed
- [ ] `inngest` package installed (version ^3.x)
- [ ] `pnpm install` runs without errors
- [ ] TypeScript compiles without errors
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
