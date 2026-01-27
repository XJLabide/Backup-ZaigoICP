# fn-2-pbf.3 Add unit tests for lib/unipile modules

## Description
Add unit tests for lib/unipile modules to test core business logic in isolation:
- `client.ts` - Unipile client initialization and env validation
- `auth.ts` - Auth link generation
- `webhook-verify.ts` - Signature verification (security-critical)
- `webhook-handlers.ts` - Event handlers

**Size:** M
**Files:**
- `apps/web/__tests__/lib/unipile/client.test.ts` (new)
- `apps/web/__tests__/lib/unipile/auth.test.ts` (new)
- `apps/web/__tests__/lib/unipile/webhook-verify.test.ts` (new)
- `apps/web/__tests__/lib/unipile/webhook-handlers.test.ts` (new)

## Approach

1. `client.test.ts`:
   - Test `getUnipileConfig()` throws on missing env vars
   - Test `getUnipileConfig()` returns valid config
   - Test `getUnipileClient()` returns UnipileClient instance
   - Test lazy initialization (Proxy behavior)

2. `auth.test.ts`:
   - Test `generateAuthLink()` returns URL and expiry
   - Test handles Unipile API errors
   - Test constructs correct request parameters

3. `webhook-verify.test.ts`:
   - Test valid signature returns `{ valid: true }`
   - Test invalid signature returns `{ valid: false, error }`
   - Test missing signature header
   - Test timing-safe comparison (no early exit)

4. `webhook-handlers.test.ts`:
   - Test `handleAccountConnected()` updates user record
   - Test `handleAccountConnected()` handles user not found
   - Test `handleAccountDisconnected()` clears connection
   - Test `dispatchWebhookEvent()` routes to correct handler

## Key context

`webhook-verify.ts` uses timing-safe comparison at line 59-62 - ensure tests don't accidentally test timing.
Follow DB mock pattern at `apps/web/__tests__/api/webhooks/unipile.test.ts:24-56`.
## Acceptance
- [ ] `__tests__/lib/unipile/client.test.ts` with 4+ test cases
- [ ] `__tests__/lib/unipile/auth.test.ts` with 3+ test cases
- [ ] `__tests__/lib/unipile/webhook-verify.test.ts` with 4+ test cases
- [ ] `__tests__/lib/unipile/webhook-handlers.test.ts` with 5+ test cases
- [ ] 100% branch coverage for webhook-verify.ts (security-critical)
- [ ] All tests pass
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
