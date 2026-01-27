# fn-1-7ye.4 Create webhook endpoint with idempotent handlers

## Description
Create the webhook endpoint that receives Unipile account events and updates user records. Must be idempotent to handle webhook replays.

**Size:** M
**Files:**
- `apps/web/app/api/webhooks/unipile/route.ts`
- `apps/web/lib/unipile/webhook-handlers.ts`

## Approach

- Follow pattern from `/docs/unipile-integration.md:117-157`
- Verify signature first, return 401 if invalid
- **Event ID derivation**: Compute SHA256 hash of the raw webhook body (before JSON parsing) to generate a stable, deterministic event ID. This ensures identical payloads produce identical IDs regardless of JSON key ordering.
- Insert into `processedWebhooks` table before processing (unique constraint catches duplicates)
- Handle events:
  - `account.connected`: Set `unipileAccountId` and `linkedInConnectedAt` on user
  - `account.disconnected`: Clear `unipileAccountId`, set `linkedInConnectedAt` to null
- Return 200 even for unknown event types (log and ignore)
- Return 500 on DB failures to trigger Unipile retry

## Key Context

Unipile provides `account_id` and `name` (our userId) in webhook payloads. The `name` field correlates to what we passed in `createHostedAuthLink`. Always return 200 for processed events to prevent infinite retries.

Raw body hashing ensures idempotency even if Unipile doesn't provide a unique event ID field.

## Acceptance
- [x] `POST /api/webhooks/unipile` accepts webhook payloads
- [x] Returns 401 for invalid/missing signature
- [x] Returns 200 for valid webhooks (even unknown event types)
- [x] Event ID computed as SHA256 hash of raw request body
- [x] `account.connected` event updates user with unipileAccountId and linkedInConnectedAt
- [x] `account.disconnected` event clears unipileAccountId and linkedInConnectedAt
- [x] Duplicate webhooks (same raw body) are idempotent (no error, no double-processing)
- [x] Unknown event types logged and acknowledged with 200
- [x] Structured logs for all received events with eventType, accountId, userId

## Done summary

Implemented webhook endpoint at POST /api/webhooks/unipile with idempotent handlers. The endpoint verifies X-Unipile-Signature headers, computes SHA256 event IDs from raw request bodies, stores processed events in the processedWebhooks table for deduplication, and dispatches to handlers for account.connected and account.disconnected events.

## Evidence
- Commits: (to be added after commit)
- Tests: npx tsc --noEmit
- PRs:
