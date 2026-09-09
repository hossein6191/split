# What was measured on chain

`tests/test_pure.py` covers the boundary, the closed set, the clock, the authority
rules, the journeys and the static rules — 30 tests, no network. It cannot reach the
question this contract exists to answer: whether independent validators, each reading
the same job and the same two accounts in both orders, arrive at the **same share**.

```
node tests/on_chain/smoke.mjs        32 passed, 0 failed   (9 September 2026, Studio, throwaway accounts)
```

The suite deploys a throwaway Split of its own each run, so its addresses are not the
deployment this repository points at. The round signed by the author is below.

## What the suite saw

| step | votes | result |
|---|---|---|
| `open` with no value | — | refused: *an empty escrow divides nothing* |
| `open` with payer = payee, 3 GEN sent | — | refused **and the 3 GEN came back** |
| `open` manual-es, 20 GEN | 5 agree | funded |
| `file` by a stranger | — | refused: *only the payer or the payee* |
| `judge` before anybody filed | — | refused |
| `file` by the payer, then again | — | filed; the second refused: *already filed* |
| `judge` with one account inside the reply window | — | refused: *the other side has 7 days* |
| `file` by the payee | — | both sides in |
| `release` on a disputed job | — | refused |
| `judge` manual-es | 3 agree, 0 disagree | **0** — *"No translation was delivered; the payee returned the original English file unchanged"* |
| `settle` inside the appeal window | — | refused: *the appeal window of 3 days is still open* |
| `accept` by the winner | — | refused: *the side that won has nothing to accept* |
| `accept` by the payee, then `settle` | — | 0 to the payee, **20 GEN back to the payer**, read from balances |
| `settle` again | — | refused |
| `judge` checkout-fix | 3 agree, 0 disagree | **100** — *"The payee delivered the requested fix with a regression test by the deadline, and the redesign was outside the job"* |
| `appeal` by the winner, 1 GEN sent | — | refused **and refunded** |
| `appeal` with half the bond | — | refused **and refunded**: *an appeal posts a bond of 10% of the pool* |
| `appeal` by the payer with 1 GEN | 3 agree, 0 disagree | judged again: **100**, before 100, moved: false |
| a second `appeal` | — | refused: *there is no second appeal* |
| `settle` | — | 10 GEN to the payee **plus the 1 GEN bond**, read from balances |
| `open` logo-set, then `release` by the payer | — | 5 GEN to the payee, no model |
| `rules()` | — | the six words, the windows, the bond, who may do what |

Both judgments settled 3 agree, 0 disagree, 2 idle, on the first ask. The reasons above
are the leaders' sentences; they are recorded and never compared.

## The round, signed by the author

Filled in from the author's two wallets: the contract address, and the transactions of
both cases including every refusal.

## Reading a judgment transaction

A `judge` that splits the vote finalises exactly like one that settled. The status says
`FINALIZED` either way; only the tally says whether anything was stored. Every script
here computes `agree * 2 > total` and reports that, and the signing page refuses to
claim a share it did not see applied.

Balances are read after the transaction finalises and then polled until they move,
because `emit_transfer` lands at finalisation and shows in the balance a few seconds
later. A refund to the *sender* of a refused payable call is checked the other way
round: the sender's balance drops the moment the transaction is sent and comes back
when the refund lands, so the check waits for the way back.
