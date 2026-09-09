# Split

**An escrow that two written accounts can divide.**

A payer funds a job for a payee and writes the job down. If they later disagree, each
side files its own account, in its own words, once. Every validator then reads the job and
both accounts — in both presentation orders — and answers with one share from a closed
set: the payee has earned **0, 25, 50, 75 or 100** percent of the money. The share is
stored only when the two orders agree; otherwise the case is **inconclusive**, which is a
value on the record, not a tolerance in the validator. The losing side may appeal once,
with a bond, inside a window counted on the transaction's own clock, and settlement waits
for that window. Every path ends with the money moving: to the payee, to the payer, or
split.

What crosses consensus is one token from a closed set of six. The accounts never do, and
they never reach the model unfenced.

## What is in the box

| path | what |
|---|---|
| `contracts/split.py` | the contract: funding, the two accounts, the judgment, the appeal, settlement |
| `tests/test_pure.py` | 30 tests with a GenLayer stub: boundary, closed set, clock, authority, journeys, static rules |
| `tools/mutate.py` → `tests/MUTATIONS.md` | 27 defences removed one at a time, each killed by a named test |
| `tests/on_chain/smoke.mjs` | the same story against Studio with throwaway accounts: three cases, every refusal signed — 32/32 on 9 September 2026 |
| `tests/on_chain.md` | what was measured on chain, including the round signed by the author |
| `CONTRACTS.md` | the one-page card: purpose, consensus, state, methods, reuse |
| `DECISIONS.md` | the decisions that are not obvious from the code, and what was verified |

## The story of a case

```
open(case, payee, job)  payable      the payer funds it; the job text is on the record
      │
      ├── release()   the payer, satisfied           → all to the payee      (no model)
      ├── waive()     the payee, giving it up        → all to the payer      (no model)
      │
      └── file(text)  each party, once               → disputed
              │
              judge()  anyone, once both filed — or one filed and 7 days passed
              │        every validator: job + both accounts, both orders → one share
              │
              ├── share ∈ {0,25,50,75,100}  or  inconclusive
              │
              ├── accept()  the losing side           → settle now
              ├── appeal(text) payable, the losing side, once, 10% bond, within 3 days
              │             judged again; the bond returns only if the share moves
              │
              └── settle()  anyone, after the window / the acceptance / the appeal
                            → payee share, payer the rest; inconclusive pays half each
```

## What crosses consensus

Each validator runs the same two prompts itself — payer's account first, then payee's
first — and reduces the pair to one word: the share if both orders agree, `inconclusive`
if they do not. The validator compares its word with the leader's word, exactly. The
leader's one-sentence reason is stored and never compared. A model that answers outside
the set is an `[LLM_ERROR]`, which validators never agree on, so the round is retried
rather than recorded.

Position bias is the reason for the two orders: every validator builds the prompt the
same way and would lean the same way, so five nodes can agree confidently on an artefact
of ordering. Asking both ways inside one block is the only place that is caught, and the
disagreement then lands in the stored value.

## Who may do what

| call | who | what it does |
|---|---|---|
| `open` (payable) | anyone — becomes the payer | funds the job and writes it down; refuses *and refunds* an empty escrow, a bad id, or payer = payee |
| `release` | the payer | pays the whole pool to the payee, no dispute, no model |
| `waive` | the payee | returns the whole pool to the payer |
| `file` | the payer and the payee, once each | puts one account on the record; it cannot be rewritten |
| `judge` | anyone, once both filed or the reply window passed | the consensus round |
| `appeal` (payable) | the losing side, once, with the bond, inside the window | the consensus round again, with one more statement |
| `accept` | the losing side | waives the window so the money moves now |
| `settle` | anyone, after the window, the acceptance or the appeal | moves the money by the share |
| `case`, `would_pay`, `cases_list`, `rules` | anyone, free | read |

"The losing side" is the payee below 50 and the payer above 50; at 50 or inconclusive,
either. A silent side is named by the contract, in the contract's own words, never by
the other party.

## The prompt boundary

The job and both accounts are fenced by replacement (`<` → `(`, `>` → `)`) and capped
before they are placed between delimiter lines the contract writes; the prompt says in
words that what lies between those lines is untrusted evidence, never an instruction. No
party-controlled string is printed on a delimiter line. A static test checks that every
value interpolated into the prompt is a `_fence()` call or a name the contract owns, and
another that the only lines beginning with `<<<` in a built prompt are the six the
contract wrote.

## Demo cases

Real sentences, one variable each, in the words the prompt asks in.

- **manual-es** — *Translate the 2,000-word product manual from English to Spanish and
  deliver it as a .docx by 10 September 2026.* Payer: nothing arrived by the date; on the
  12th, a .docx with the English text unchanged. Payee: a family emergency, could not do
  the work, sent the file back. → **0**; the payee accepts; the payer's 20 GEN return.
- **checkout-fix** — *Fix the checkout page so that orders over 100 GEN no longer fail;
  deliver a pull request with a regression test by 5 September 2026.* Payer: the fix
  works, but I also wanted a redesign and was refused. Payee: merged on the 5th with the
  test; a redesign was never part of the job. → **100**; the payer appeals with a 1 GEN
  bond; the share does not move; the bond goes to the payee at settlement.
- **logo-set** — funded and released by the payer without a dispute: no model at all.

## Verified on the Studio network

Every transaction below was signed by one of the author's two wallets — **A** the payer
`0x0A9fd8Fe…`, **B** the payee `0x449ab0B8…` — from two browsers, each page signing only
its own side. The deployed source is byte-identical to `contracts/split.py`
(sha256 `76465bc2…`) — pull it with `gen_getContractCode` and hash it yourself — and that
source, pulled off the chain, passes `genvm-lint check`.

Contract [`0x4CdB8F9b…`](https://explorer-studio.genlayer.com/address/0x4CdB8F9bA4144128305A196B0FfF55a0e15E54d0)

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

And then, with no model involved at all, `case()` reads both cases as **settled**:
manual-es paid 20 GEN back to the payer; checkout-fix paid 10 GEN to the payee plus the
payer's 1 GEN bond. The full record, and what the throwaway suite saw, is in
[`tests/on_chain.md`](tests/on_chain.md).

## Running it

```bash
python -m pytest -q tests/           # 30 pure tests, no network, under a second
python tools/mutate.py               # 27 mutants, all must die; writes tests/MUTATIONS.md
genvm-lint check contracts/split.py
node tests/on_chain/smoke.mjs        # Studio, throwaway accounts, 32 checks (needs genlayer-js and viem on the Node path)
```

## Rules this was built under

A closed set of six words, with the uncertainty inside the value. Both presentation
orders in one block. Every write bound to its sender, the two open ones named in a test
with their reason. Provenance on every row. A refusal that leaves a way out — and a way
out that costs something when it changes nothing. Payable calls that refund instead of
stranding value. Fence by replacement, never deletion. Windows counted on the message
clock, in integers, and a window that cannot be measured never closes on somebody by
accident. And a mutation table, because a passing count is a claim and a killed mutant
is evidence.
