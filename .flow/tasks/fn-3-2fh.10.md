# fn-3-2fh.10 Quality scorer module

## Description
Create message quality scoring module using LLM-as-judge pattern.

**Size:** M
**Files:**
- `apps/web/lib/agents/quality-scorer.ts` (new)

## Approach

- Call Claude to evaluate message against rubric
- Return score (0-100) and issues array
- Scoring dimensions: personalization, relevance, authenticity, clarity, length

Reference quality rules: `docs/mvp-overview.md:139-150`

## Key context

- MIN_QUALITY_SCORE = 60 (from shared constants)
- MAX_CONNECTION_MESSAGE_LENGTH = 300
- Issues should be actionable strings for UI
- Use structured output (JSON mode) for reliable parsing
## Acceptance
- [ ] `scoreMessage()` function exported
- [ ] Returns score (0-100) and issues array
- [ ] Uses Claude for evaluation (LLM-as-judge)
- [ ] Checks length against 300 char limit
- [ ] Checks for spam phrases
- [ ] Checks for personalization
- [ ] Returns structured issues for UI display
- [ ] Unit test covers low/medium/high score cases
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
