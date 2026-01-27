# fn-1-7ye.6 Build LinkedIn connection status component

## Description
Build a reusable React component that displays LinkedIn connection status. Used on the onboarding page and potentially the dashboard.

**Size:** S
**Files:**
- `apps/web/components/linkedin-connection-status.tsx`

## Approach

- Client component with state machine: `idle | connecting | connected | disconnected | error`
- Use status badge pattern from shadcn/ui
- Green indicator for connected, gray for disconnected, yellow for connecting
- Show "Connected" with timestamp, or "Not connected" with connect prompt
- Accept `onConnect` callback prop for triggering connection flow

## Key Context

Use a state machine (discriminated union) rather than multiple boolean flags to prevent impossible states. Follow the badge pattern from research: Circle icon + label + appropriate color.
## Acceptance
- [ ] Component exported from `apps/web/components/linkedin-connection-status.tsx`
- [ ] Displays appropriate state: idle, connecting, connected, disconnected, error
- [ ] Connected state shows green indicator and "Connected" with timestamp
- [ ] Disconnected state shows gray indicator and "Not connected"
- [ ] Connecting state shows yellow indicator with loading animation
- [ ] Error state shows red indicator with error message
- [ ] Accepts `status` prop with type-safe state machine
- [ ] Accepts optional `onConnect` callback for triggering connection
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
