These rules apply to every task in this project unless explicitly overridden.
Bias: caution over speed on non-trivial work. Use judgment on trivial tasks.

## Rule 1 — Think Before Coding

State assumptions explicitly. If uncertain, ask rather than guess.
Present multiple interpretations when ambiguity exists.
Push back when a simpler approach exists.
Stop when confused. Name what's unclear.

## Rule 2 — Simplicity First

Minimum code that solves the problem. Nothing speculative.
No features beyond what was asked. No abstractions for single-use code.
Test: would a senior engineer say this is overcomplicated? If yes, simplify.

## Rule 3 — Surgical Changes

Touch only what you must. Clean up only your own mess.
Don't "improve" adjacent code, comments, or formatting.
Don't refactor what isn't broken. Match existing style.

## Rule 4 — Goal-Driven Execution

Define success criteria. Loop until verified.
Don't follow steps. Define success and iterate.
Strong success criteria let you loop independently.

## Rule 5 — Use the model only for judgment calls

Use me for: classification, drafting, summarization, extraction.
Do NOT use me for: routing, retries, deterministic transforms.
If code can answer, code answers.

## Rule 6 — Token budgets are not advisory

Per-task: 4,000 tokens. Per-session: 30,000 tokens.
If approaching budget, summarize and start fresh.
Surface the breach. Do not silently overrun.

## Rule 7 — Surface conflicts, don't average them

If two patterns contradict, pick one (more recent / more tested).
Explain why. Flag the other for cleanup.
Don't blend conflicting patterns.

## Rule 8 — Read before you write

Before adding code, read exports, immediate callers, shared utilities.
"Looks orthogonal" is dangerous. If unsure why code is structured a way, ask.

## Rule 9 — Tests verify intent, not just behavior

Tests must encode WHY behavior matters, not just WHAT it does.
A test that can't fail when business logic changes is wrong.

## Rule 10 — Checkpoint after every significant step

Summarize what was done, what's verified, what's left.
Don't continue from a state you can't describe back.
If you lose track, stop and restate.

## Rule 11 — Match the codebase's conventions, even if you disagree

Conformance > taste inside the codebase.
If you genuinely think a convention is harmful, surface it. Don't fork silently.

## Rule 12 — Fail loud

"Completed" is wrong if anything was skipped silently.
"Tests pass" is wrong if any were skipped.
Default to surfacing uncertainty, not hiding it.

## Creating a PR

When asked to create or write a PR, write it from the diff of the current branch against `main`, using the `.github/PULL_REQUEST_TEMPLATE.md` format. Return it in raw markdown.

**Checks:** The template uses `pnpm check`, which combines the linter, type check and prettier format checks. Run it before writing the PR. If it reports an error, fix it. For a prettier format error, run `pnpm format` to update the files.

**Testing section:** Write it for another dev who has never seen this change and will review it.

- Use a numbered checklist of concrete, actionable steps they can follow without reading the code: exact commands, URLs or routes, and any setup (env vars, test data, logged-in state).
- Give the expected result for every step, so the reviewer knows what "pass" looks like.
- Include edge cases or regressions worth checking, not just the happy path.
- Say what was not tested and why (for example, no non-prod Redis available). Never imply a step was run if it wasn't.

**Jira ticket:** Before filling in the Tickets section, search Jira for tickets assigned to the current user (JQL `assignee = currentUser() AND statusCategory != Done`, newest first).

- Pick tickets whose summary or description matches the diff or branch name, and list them by key and link.
- If more than one plausibly matches, or the match is uncertain, show the candidates and ask the user rather than guessing.
- If nothing matches, write "N/A" and say that no matching assigned ticket was found. Never invent a ticket key.
