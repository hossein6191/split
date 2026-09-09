# Split — one page

**Purpose.** Divide an escrow between a payer and a payee from the two accounts they
wrote, without a human arbiter and without either side being able to instruct the judge.

**Consensus.** `judge` and `appeal` run one nondeterministic block. The leader asks the
model twice — the payer's account first, then the payee's — and reduces the two answers
to one word: the share if they agree, `inconclusive` if not. Each validator does the
same and compares only that word with the leader's. Reasons are recorded, never
compared. Errors carry a class prefix: `[EXPECTED]` must match exactly, `[TRANSIENT]`
agrees with `[TRANSIENT]`, `[LLM_ERROR]` never agrees.

**State.** `TreeMap[str, Case]` of scalars: payer, payee, job, pool, status
(`funded → disputed → judged → settled`), both accounts and their filing times,
share, reason, judged_at, judgments, appellant, appeal text and bond, the share before
the appeal, who accepted, who settled, what was paid to each side. `DynArray[str]` of
case ids for listing.

**Key methods.** `open` (payable) · `release` · `waive` · `file` · `judge` · `appeal`
(payable) · `accept` · `settle` · views `case`, `would_pay`, `cases_list`, `rules`.

**Reuse.** Any two-party job with money in the middle: freelance work, a bounty, a
deposit. Replace the closed set (five shares) with another closed set — say, three
outcomes — and the same block, boundary, windows and bond carry over. `would_pay` lets
another contract read the settlement before it happens, with no model.

**Note.** Everything the validators read is on chain. Nothing is fetched. A share is
what independent runs agreed on, not a fact about the job; the appeal and the half-each
rule are there for the cases where they did not.
