/* Split against GenLayer Studio, with throwaway accounts. Deploys its own copy.
 *
 *   node tests/on_chain/smoke.mjs                       # everything, on a fresh deployment
 *   SPLIT=0x… PHASE=A node tests/on_chain/smoke.mjs     # one phase (A, B or C) against an existing deployment
 *
 * A full run is about thirty-five transactions; phases exist so a run that
 * outlives a tool's time budget can be continued rather than restarted.
 *
 * Three cases: nothing delivered (the payer's money comes back), the job done
 * as written with a complaint outside it (the payee is paid; the payer's
 * appeal moves nothing and costs the bond), and a job released without a
 * dispute. Every refusal the contract makes is exercised as a signed
 * transaction, and every payout is read from balances after finalisation.
 */
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { generatePrivateKey } from "viem/accounts";
import { readFileSync } from "node:fs";

const RPC = "https://studio.genlayer.com/api";
const rpc = async (m, p) => { let last; for (let i = 0; i < 8; i++) { try { const r = await fetch(RPC, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: m, params: p }) }); return (await r.json()).result; } catch (e) { last = e; await new Promise((x) => setTimeout(x, 2500)); } } throw last; };
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d ? "  — " + d : ""}`); };
const GEN = 10n ** 18n;

const payer = createAccount(generatePrivateKey()), payee = createAccount(generatePrivateKey()), stranger = createAccount(generatePrivateKey());
for (const a of [payer, payee, stranger]) await rpc("sim_fundAccount", { account_address: a.address, amount: 400e18 });
const cp = createClient({ chain: studionet, account: payer }), ce = createClient({ chain: studionet, account: payee }), cs = createClient({ chain: studionet, account: stranger }), rd = createClient({ chain: studionet });
const balance = async (a) => BigInt(await rpc("eth_getBalance", [a, "latest"]) || "0x0");
const moved = async (a, before) => { for (let i = 0; i < 15; i++) { const b = await balance(a); if (b !== before) return b; await new Promise((r) => setTimeout(r, 4000)); } return await balance(a); };
const tally = (r) => `${r.votes.agree} agree, ${r.votes.disagree} disagree, ${r.votes.idle} idle`;

const wait = async (tx) => { for (let i = 0; i < 90; i++) { await new Promise((r) => setTimeout(r, 4000)); const t = await rpc("eth_getTransactionByHash", [tx]); if (t?.status === "FINALIZED") { const lr = t.consensus_data?.leader_receipt, one = Array.isArray(lr) ? lr[0] : lr; let msg = ""; try { msg = Buffer.from(one.result, "base64").toString("utf8").replace(/[^\x20-\x7e]/g, " ").trim(); } catch (e) {} let a = 0, d = 0, idl = 0; for (const k in (t.consensus_data?.votes || {})) { const v = t.consensus_data.votes[k]; if (v === "agree") a++; else if (v === "disagree") d++; else idl++; } const votes = { agree: a, disagree: d, idle: idl }; const applied = a * 2 > a + d + idl; let j = null; const b = msg.indexOf("{"); if (b !== -1) { try { j = JSON.parse(msg.slice(b)); } catch (e) {} } return { msg, j, exec: one?.execution_result, votes, applied }; } if (t?.status === "CANCELED") return { msg: "CANCELED", votes: { agree: 0, disagree: 0, idle: 0 }, applied: false }; } return { msg: "TIMEOUT", votes: { agree: 0, disagree: 0, idle: 0 }, applied: false }; };
const PHASE = (process.env.PHASE || "ALL").toUpperCase();
const on = (p) => PHASE === "ALL" || PHASE === p;
const tag = "-" + Date.now().toString(36).slice(-4);          // case ids are unique per run, so a deployment can be reused
let A = process.env.SPLIT;
if (!A) {
  const code = readFileSync(new URL("../../contracts/split.py", import.meta.url));
  const dh = await cp.deployContract({ code, args: [], leaderOnly: false });
  A = (await cp.waitForTransactionReceipt({ hash: dh, status: "ACCEPTED", retries: 40, interval: 4000 }))?.data?.contract_address;
}
console.log("Split at", A, "· phase", PHASE, "· tag", tag, "\n");
const send = async (client, fn, args = [], value) => wait(await client.writeContract({ address: A, functionName: fn, args, ...(value ? { value } : {}) }));
const view = async (fn, args = []) => { try { return await rd.readContract({ address: A, functionName: fn, args }); } catch (e) { return "VIEW ERROR " + fn + ": " + (e?.shortMessage || String(e)).slice(0, 100); } };

if (on("A")) {
// ---------- refusals that refund, decided in code ----------
const b0 = await balance(payer.address);
const empty = await send(cp, "open", ["manual-es" + tag, payee.address, "Translate the 2,000-word product manual from English to Spanish and deliver it as a .docx by 10 September 2026."], 0n);
ok("an empty escrow is refused", empty.j?.ok === false && String(empty.j?.reason).includes("empty escrow"), empty.j?.reason?.slice(0, 60));
const self = await send(cp, "open", ["manual-es" + tag, payer.address, "job"], 3n * GEN);
ok("payer and payee must differ — and the money comes back", self.j?.ok === false && String(self.j?.reason).includes("different accounts"), self.j?.reason?.slice(0, 70));
ok("the refund is real (gas only)", b0 - (await moved(payer.address, b0)) < 1n * GEN);

// ---------- case A: nothing delivered ----------
const openA = await send(cp, "open", ["manual-es" + tag, payee.address, "Translate the 2,000-word product manual from English to Spanish and deliver it as a .docx by 10 September 2026. Fee: 20 GEN."], 20n * GEN);
ok("a job is funded", openA.j?.ok === true && openA.j?.pool === String(20n * GEN), tally(openA));
const strangerFile = await send(cs, "file", ["manual-es" + tag, "I saw the whole thing."]);
ok("a stranger cannot file an account", strangerFile.exec === "ERROR" && strangerFile.msg.includes("only the payer or the payee"), strangerFile.msg.slice(0, 60));
const early = await send(cs, "judge", ["manual-es" + tag]);
ok("nothing to judge before anybody files", early.exec === "ERROR" && early.msg.includes("nothing to judge"));
const fA1 = await send(cp, "file", ["manual-es" + tag, "Nothing was delivered by 10 September. On 12 September I received a .docx containing the English text unchanged, and no reply since."]);
ok("the payer files", fA1.j?.filed_by === "payer" && fA1.j?.both_filed === false);
const again = await send(cp, "file", ["manual-es" + tag, "Also it was late."]);
ok("an account is filed once and not rewritten", again.exec === "ERROR" && again.msg.includes("already filed"));
const tooSoon = await send(cs, "judge", ["manual-es" + tag]);
ok("judgment waits for the other side's reply window", tooSoon.exec === "ERROR" && tooSoon.msg.includes("window is still open"), tooSoon.msg.slice(0, 70));
const fA2 = await send(ce, "file", ["manual-es" + tag, "I had a family emergency and could not do the work. I sent the file back so the client would have it."]);
ok("the payee files, and both sides are in", fA2.j?.both_filed === true);
const noRelease = await send(cp, "release", ["manual-es" + tag]);
ok("a disputed job is not released", noRelease.exec === "ERROR" && noRelease.msg.includes("judged"));
const jA = await send(cs, "judge", ["manual-es" + tag]);
ok("the validators judge case A and agree", jA.applied && jA.j?.ok === true, `${tally(jA)} → ${jA.j?.share} · ${String(jA.j?.reason).slice(0, 90)}`);
ok("nothing delivered is a share of 0", jA.j?.share === "0");
const wp = JSON.parse(String(await view("would_pay", ["manual-es" + tag])));
ok("would_pay reads the share with no model and no consensus", wp.judged === true && wp.to_payer === String(20n * GEN), `to payer ${wp.to_payer}`);
const settleEarly = await send(cs, "settle", ["manual-es" + tag]);
ok("settlement waits for the appeal window", settleEarly.exec === "ERROR" && settleEarly.msg.includes("still open"), settleEarly.msg.slice(0, 70));
const winnerAccept = await send(cp, "accept", ["manual-es" + tag]);
ok("the winner has nothing to accept", winnerAccept.exec === "ERROR" && winnerAccept.msg.includes("won"));
const loserAccept = await send(ce, "accept", ["manual-es" + tag]);
ok("the loser accepts the judgment", loserAccept.j?.accepted_by === "payee");
const bp = await balance(payer.address);
const sA = await send(cs, "settle", ["manual-es" + tag]);
ok("settle moves the money by the share", sA.j?.ok === true && sA.j?.to_payer === String(20n * GEN) && sA.j?.to_payee === "0", `${sA.j?.to_payee} / ${sA.j?.to_payer}`);
ok("and the payer's 20 GEN came back", (await moved(payer.address, bp)) - bp === 20n * GEN);
const twice = await send(cs, "settle", ["manual-es" + tag]);
ok("a case settles once", twice.exec === "ERROR" && twice.msg.includes("nothing to settle"));

}
if (on("B")) {
// ---------- case B: the job as written, and a complaint outside it ----------
const openB = await send(cp, "open", ["checkout-fix" + tag, payee.address, "Fix the checkout page so that orders over 100 GEN no longer fail at payment; deliver a pull request with a regression test by 5 September 2026. Fee: 10 GEN."], 10n * GEN);
ok("case B is funded", openB.j?.ok === true);
await send(cp, "file", ["checkout-fix" + tag, "The pull request arrived on 4 September and the fix works. But I also wanted the checkout page redesigned and the payee refused to do it."]);
await send(ce, "file", ["checkout-fix" + tag, "The pull request fixes the failing orders and includes a regression test; it was merged on 5 September. A redesign was never part of the job."]);
const jB = await send(cs, "judge", ["checkout-fix" + tag]);
ok("the validators judge case B and agree", jB.applied && jB.j?.ok === true, `${tally(jB)} → ${jB.j?.share} · ${String(jB.j?.reason).slice(0, 90)}`);
ok("the job as written is a share of 100", jB.j?.share === "100");
const payeeAppeal = await send(ce, "appeal", ["checkout-fix" + tag, "I want more."], 1n * GEN);
ok("the winner cannot appeal, and the bond comes back", payeeAppeal.j?.ok === false && String(payeeAppeal.j?.reason).includes("lost"));
const smallBond = await send(cp, "appeal", ["checkout-fix" + tag, "The redesign was implied."], (1n * GEN) / 2n);
ok("an appeal without the full bond is refused and refunded", smallBond.j?.ok === false && String(smallBond.j?.reason).includes("bond"), smallBond.j?.reason?.slice(0, 80));
const be = await balance(payee.address);
const appealB = await send(cp, "appeal", ["checkout-fix" + tag, "The redesign was implied by the word 'page' in the job, so the job is not finished."], 1n * GEN);
ok("the loser appeals with the bond and the validators judge again", appealB.applied && appealB.j?.ok === true, `${tally(appealB)} → ${appealB.j?.share} (before ${appealB.j?.before}) · moved ${appealB.j?.moved}`);
const second = await send(cp, "appeal", ["checkout-fix" + tag, "once more"], 1n * GEN);
ok("there is no second appeal", second.j?.ok === false && String(second.j?.reason).includes("once"));
const sB = await send(cs, "settle", ["checkout-fix" + tag]);
ok("an appeal that was heard settles at once", sB.j?.ok === true, `to payee ${sB.j?.to_payee} · bond to ${sB.j?.bond_to}`);
if (appealB.j?.moved === false) {
  ok("an appeal that moved nothing costs the bond: the payee gets 10 GEN + the 1 GEN bond", (await moved(payee.address, be)) - be === 11n * GEN);
} else {
  ok("the share moved on appeal, so the bond went back to the payer", sB.j?.bond_to === "appellant");
}

}
if (on("C")) {
// ---------- case C: no dispute at all ----------
await send(cp, "open", ["logo-set" + tag, payee.address, "Three logo concepts as SVG by 12 September 2026. Fee: 5 GEN."], 5n * GEN);
const be2 = await balance(payee.address);
const rel = await send(cp, "release", ["logo-set" + tag]);
ok("a satisfied payer releases without any model", rel.j?.ok === true && rel.j?.how === "released by the payer");
ok("and the payee has the 5 GEN", (await moved(payee.address, be2)) - be2 === 5n * GEN);

const rules = JSON.parse(String(await view("rules")));
ok("the rules are published by the contract", rules.shares?.length === 5 && rules.who?.file?.includes("payer and the payee"));
}
console.log(`\n${pass} passed, ${fail} failed`);
console.log("contract:", A);
