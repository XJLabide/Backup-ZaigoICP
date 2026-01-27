# fn-1-7ye.3 Implement webhook signature verification

## Description
Implement webhook signature verification to ensure incoming webhooks are authentic. This is a security-critical component.

**Size:** S
**Files:**
- `apps/web/lib/unipile/webhook-verify.ts`

## Approach

- Unipile uses custom header authentication (NOT HMAC-SHA256)
- When creating webhook in Unipile dashboard, set header: `X-Unipile-Signature: <secret>`
- Verify this header value matches `UNIPILE_WEBHOOK_SECRET` env var
- Use `crypto.timingSafeEqual()` to prevent timing attacks on string comparison
- Return `{ valid: boolean, error?: string }`

## Key Context

Unlike Stripe/GitHub which use HMAC-SHA256 over the payload, Unipile uses a simpler static secret header. The secret is configured when creating the webhook in Unipile dashboard. Still use timing-safe comparison to be security-conscious and prevent timing attacks.

## Acceptance
- [ ] `verifyWebhookSignature(signature: string | null): { valid: boolean; error?: string }` exported
- [ ] Compares header value against `UNIPILE_WEBHOOK_SECRET` env var
- [ ] Uses `crypto.timingSafeEqual` for timing-safe string comparison
- [ ] Returns `{ valid: false, error: "Missing signature" }` when header absent
- [ ] Returns `{ valid: false, error: "Invalid signature" }` when mismatch
- [ ] Returns `{ valid: true }` when signature matches secret
- [ ] Handles different buffer lengths without throwing

## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
