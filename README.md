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
| `tests/on_chain/smoke.mjs` | the same story against Studio with throwaway accounts: three cases, every refusal signed |
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

## Evidence

Filled in from the author's wallets at deployment: the contract address, and the
transactions of both cases including every refusal.

## Running it

```bash
python -m pytest -q tests/           # 30 pure tests, no network, under a second
python tools/mutate.py               # 27 mutants, all must die; writes tests/MUTATIONS.md
genvm-lint check contracts/split.py
node tests/on_chain/smoke.mjs        # Studio, throwaway accounts (needs genlayer-js and viem on the Node path)
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
