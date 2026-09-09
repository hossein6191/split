# Decisions

## The boundary, written before the code

- **The contract owns:** the pool, the job text, both accounts and who filed them, the
  judgment (the closed set, both orders, the comparison rule), the windows, the appeal
  and its bond, and the payout.
- **The parties own:** their accounts. They are untrusted the moment they are written:
  fenced at the prompt boundary, declared untrusted in the prompt, stored as written.
- **Nothing outside the chain is fetched.** The evidence is what the two sides wrote.
  A page or a file could be pinned by hash and read; it was not, on purpose: this
  primitive is about dividing money on two accounts, and adding a fetch would add a
  second trust problem to the first.

User action → evidence → nondet call → equivalence → state → settlement:
`file` ×2 → `judge` → each validator asks the same question twice, payer first and payee
first → the share if both orders agree, else inconclusive → compared as one word → the
losing side accepts or appeals → `settle` moves the money.

## Why six words

Difficulty of the judgment and difficulty of the agreement are independent, and the
second is chosen by the block's return value. Dividing an escrow is a hard judgment;
agreeing on one of `0, 25, 50, 75, 100, inconclusive` is not. Nothing finer was asked
for — no percentages, no prose — because nothing finer would settle.

## Why inconclusive is a value

The two orders can disagree. Two places could absorb that: the validator, by forgiving
a one-step difference; or the value, by storing that the readings disagreed. The first
lets a node vote agree while believing something else. The second is honest and has a
consequence: the losing side (either side, at inconclusive) may appeal with new words,
and if the second judgment is also inconclusive the money is split in half. The rule is
published by `rules()`, so nobody learns it from a settlement.

## Why the appeal has a bond, and why only once

An appeal without a cost is "ask again until the answer suits". The bond is 10% of the
pool; it returns if the share moves and goes to the other side if it does not, so a
second look is available and a fishing expedition is not. There is no second appeal:
one look, one second look, then the money moves. The windows — 7 days to reply, 3 days
to appeal — are counted on `gl.message_raw["datetime"]`, the only clock every node
sees identically, with integer arithmetic because floats and `datetime` trap the VM in
deterministic mode (measured on Passport, 7 September 2026). A clock that cannot be read
leaves a window open: it never closes on somebody by accident.

## Why settlement waits

Cachet was rejected because its appeal methods existed and no window did: a buyer
could score and award in consecutive transactions, so the path was unreachable on every
real round. Here `settle` refuses while the window is open, unless the losing side has
accepted — which is the only way the window shortens, and only the loser can do it.

## Why the silent side is named by the contract

If one side never files, judgment proceeds after the reply window. The missing account
is a contract constant — *"(this side filed no account within the window)"* — never a
string the other party wrote, so the prompt still holds exactly two accounts and neither
was written by the opponent.

## Why payable refusals refund

Value sent to a refused payable call is stranded by the chain. `open` and `appeal`
therefore never raise after taking value: every refusal returns the money in the same
transaction and says why in the result.

## Verified and not verified

- Verified on Studio: value transfer with `emit_transfer` lands after finalisation and
  shows in balances a few seconds later (the on-chain suite polls until it moves);
  `gl.message_raw["datetime"]` is present in writes and views; integer calendar
  arithmetic runs in a view; a split vote finalises and stores nothing.
- Not verified, by design: which model the validators run. The share is what five
  independent runs agreed on, not a fact about the job.
