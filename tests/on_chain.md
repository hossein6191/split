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

Two wallets, two browsers: **A** (the payer) is `0x0A9fd8Fe0b041974e8F794fCf3Eed352c14cf5fe`,
**B** (the payee) is `0x449ab0B80539A6358d6a78664221de0A1d96C65A`. Each side signed only its
own transactions; nothing in this record is second-hand.

```
Split  0x4CdB8F9bA4144128305A196B0FfF55a0e15E54d0
deployed code == contracts/split.py, sha256 76465bc2…  (pulled off chain, lint-clean)
```

| step | by | tx | votes | result |
|---|---|---|---|---|
| deploy | A | [`0x02928b11…`](https://explorer-studio.genlayer.com/tx/0x02928b11842af8debe6667df2fb6f4882758e4c3d57050373cb27f9cbfa86a97) | 4 agree, 0 disagree | `0x4CdB8F9b…` |
| `open` manual-es, 20 GEN | A | [`0xe3fd8008…`](https://explorer-studio.genlayer.com/tx/0xe3fd8008c5335ed85bee1235827da102213ade59512853b059eabe6654350874) | 3 agree, 0 disagree | funded |
| `file` by the payer | A | [`0x9fa3b248…`](https://explorer-studio.genlayer.com/tx/0x9fa3b2481f0a87410e5a9aeed8bb96b3d161312be7090f24f350127191eb639c) | 3 agree, 0 disagree | disputed |
| `file` by the payer, again | A | [`0x1657aa15…`](https://explorer-studio.genlayer.com/tx/0x1657aa15729f4096f09c416e2a65090a6535a483d3e0d3039dde344f580cf675) | 3 agree, 0 disagree | **refused**: *the payer has already filed; the account cannot be rewritten* |
| `file` by the payee | B | [`0x8fe1a8d4…`](https://explorer-studio.genlayer.com/tx/0x8fe1a8d40aaa1e93b0a76138da9c3dcd1325bab0bb5b3830afb9be373b188495) | 4 agree, 0 disagree | both sides in |
| `judge` | A | [`0x70ad5cbb…`](https://explorer-studio.genlayer.com/tx/0x70ad5cbb48f470a7b0a7985bac8180ae026a78f5ab94691b52225d5623700c08) | 3 agree, 0 disagree | **0** — *No translation was performed; the payee returned the original English file unchanged, delivering nothing of value from the job as written.* |
| `accept` by the payee | B | [`0xed85ea5d…`](https://explorer-studio.genlayer.com/tx/0xed85ea5d650e8f976fb82fbb4e2b9055e1c1898ce992f575af471e5877e62885) | 3 agree, 0 disagree | the losing side waives the window |
| `settle` | A | [`0x39d49774…`](https://explorer-studio.genlayer.com/tx/0x39d49774358ad3b7998a4efaa9ad08c0417a3e0cb46f961a5ac5f67ae94d5341) | 3 agree, 0 disagree | 0 to the payee, **20 GEN back to the payer** |
| `open` checkout-fix, 10 GEN | A | [`0x23f24a17…`](https://explorer-studio.genlayer.com/tx/0x23f24a17987b1b546073d4a122d001b452cf12ddf12179d547179a40d5c5cff6) | 3 agree, 0 disagree | funded |
| `file` by the payer | A | [`0xf95b5607…`](https://explorer-studio.genlayer.com/tx/0xf95b5607da2c210c5f44117e8664c810c71768aec2b72abd36ec703d9badf882) | 3 agree, 0 disagree | disputed |
| `file` by the payee | B | [`0x40a4190f…`](https://explorer-studio.genlayer.com/tx/0x40a4190f2ab0e566197149175ec8b46e4d2f8248dfbb26de4f7bc9edc1113595) | 3 agree, 0 disagree | both sides in |
| `judge` | B | [`0x3945f304…`](https://explorer-studio.genlayer.com/tx/0x3945f304b3f26a8134334082599689fb707e694eb97fca1d0a6d3ad027b59249) | 3 agree, 0 disagree | **100** — *The payee completed all requirements specified in the job description, including the fix and regression test, by the deadline.* |
| `appeal` by the payer, 1 GEN bond | A | [`0xc09eed64…`](https://explorer-studio.genlayer.com/tx/0xc09eed644dd37a242a2da67b297fa56945c5e634b45d5faf7f59daa64a25df05) | 3 agree, 0 disagree | judged again: **100**, before 100, **moved: false** — *…redesign was not part of the written job.* |
| `settle` | B | [`0xbd689b77…`](https://explorer-studio.genlayer.com/tx/0xbd689b77bea089b76986fe2da57c821bbfc4bf2649c03d8f58b4b922fb69dcbd) | 3 agree, 0 disagree | **10 GEN to the payee, plus the 1 GEN bond**; 0 to the payer |

Read back from the chain afterwards:

```
case("manual-es")      status settled · share 0 · judgments 1
                       accepted_by B · settled_by A · paid_payer 20 GEN · paid_payee 0
case("checkout-fix")   status settled · share 100 · judgments 2
                       appellant A · share_before_appeal 100 · settled_by B
                       paid_payee 10 GEN (+ the 1 GEN bond) · paid_payer 0
```

Both judgments and the appeal settled 3 agree, 0 disagree, 2 idle on the first ask. The
fourth row is a stored refusal from the author's own wallet: an account, once filed, is
not rewritten. The appeal is the other artifact worth reading: a second look was
available, it changed nothing, and it cost the side that asked.

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
