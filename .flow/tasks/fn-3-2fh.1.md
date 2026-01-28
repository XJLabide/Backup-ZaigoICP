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
Installed AI SDK (ai@^6.0.57, @ai-sdk/anthropic@^3.0.28) and Inngest (inngest@^3.49.3) dependencies. Also scaffolded missing pnpm workspace config, root package.json, @repo/shared package, and tsconfig.json for apps/web.
## Evidence
- Commits: 6df4a2c887d3f6dde2eb9c2b1d1382dc438f11fe
- Tests: pnpm install (verified no errors), TypeScript import test for ai, @ai-sdk/anthropic, inngest (verified compiles)
- PRs: