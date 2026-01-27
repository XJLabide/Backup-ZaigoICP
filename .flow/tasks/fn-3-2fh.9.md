# fn-3-2fh.9 AI message generator module

## Description
Create AI message generator module using Vercel AI SDK with Claude.

**Size:** M
**Files:**
- `apps/web/lib/agents/message-generator.ts` (new)

## Approach

- Use `generateText` from `ai` package (not streaming)
- Configure `@ai-sdk/anthropic` with Claude Sonnet
- Build prompt from lead profile + campaign settings
- Return message text and metadata (tokens used)

Reference prompt template: `docs/mvp-overview.md:114-137`

## Key context

- Model: `claude-sonnet-4-5-20250929`
- Temperature: 0.7 (some creativity)
- Max tokens: 500 (message is <300 chars but allow thinking)
- Include lead: firstName, headline, company, recentPost, about
- Include campaign: tone, cta, calendarLink
- Enforce 300 char limit in prompt
## Acceptance
- [ ] `generateMessage()` function exported
- [ ] Uses Vercel AI SDK generateText
- [ ] Configures Claude Sonnet model
- [ ] Builds prompt from lead + campaign data
- [ ] Returns message text and token usage
- [ ] Handles missing lead fields gracefully
- [ ] Unit test with mocked AI response
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
