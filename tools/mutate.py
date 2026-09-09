"""Remove each defence of contracts/split.py in turn and record the test that killed it.

    python tools/mutate.py        # writes tests/MUTATIONS.md; exit 1 if any mutant survives
The harness refuses to run over a failing baseline, and treats a mutant that
does not even import as a broken anchor, never as a kill.
"""
import os, pathlib, re, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = (ROOT / "contracts" / "split.py").read_text(encoding="utf-8")
PYTEST = [sys.executable, "-m", "pytest", "-q", "-x", "--no-header", "-p", "no:cacheprovider", str(ROOT / "tests" / "test_pure.py")]

MUTATIONS = [
    ("fence does nothing", 'return str(raw).replace("<", "(").replace(">", ")")', 'return str(raw)'),
    ("fence deletes instead of replacing", 'return str(raw).replace("<", "(").replace(">", ")")', 'return str(raw).replace("<", "").replace(">", "")'),
    ("the job goes in unfenced", '"<<<JOB>>>\\n" + _fence(job)[:MAX_TEXT_CHARS]', '"<<<JOB>>>\\n" + job[:MAX_TEXT_CHARS]'),
    ("the second order is the first order", '    first, second = (payer_block, payee_block) if payer_first else (payee_block, payer_block)', '    first, second = (payer_block, payee_block)'),
    ("the share may be anything", '    if share not in SHARES:\n        raise gl.vm.UserError(ERROR_LLM + " the judge answered outside the set: " + share[:40])\n', ''),
    ("a disagreement between the orders is forgiven", '    if share_a == share_b:\n        return share_a, reason_a\n', '    if True:\n        return share_a, reason_a\n'),
    ("anyone may release", '        if gl.message.sender_address != case.payer:\n            _fail("only the payer releases a job")\n', ''),
    ("anyone may waive", '        if gl.message.sender_address != case.payee:\n            _fail("only the payee waives a job")\n', ''),
    ("a stranger may file", '        if sender != case.payer and sender != case.payee:\n            _fail("only the payer or the payee of " + case_id + " may file an account")\n', ''),
    ("an account can be rewritten", '            if case.payer_text:\n                _fail("the payer has already filed; the account cannot be rewritten")\n', ''),
    ("a disputed job can still be released", '        if case.status != STATUS_FUNDED:\n            _fail("a job under dispute is not released; it is judged")\n', ''),
    ("judgment does not wait for the reply window", '        if not (case.payer_text and case.payee_text) and _window_open(str(case.opened_at), now, REPLY_DAYS):', '        if False:'),
    ("the silent side is written by the other party", '        payee_text = str(case.payee_text) or SILENT\n        share, reason = self._ask', '        payee_text = str(case.payee_text) or str(case.payer_text)\n        share, reason = self._ask'),
    ("the winner may appeal", '        elif not self._may_appeal(case, sender):\n            problem = "only the side that lost may appeal; at 50 or inconclusive, either side may"\n', ''),
    ("a second appeal is allowed", '        elif _hex(case.appellant) != ZERO:\n            problem = "this case has already been appealed once; there is no second appeal"\n', ''),
    ("the appeal window never closes", '        elif not _window_open(str(case.judged_at), _now(), APPEAL_DAYS):\n            problem = "the appeal window of " + str(APPEAL_DAYS) + " days has closed"\n', ''),
    ("no bond is required", '        elif value < self._bond(case):', '        elif False:'),
    ("an acceptance can be taken back by appealing", '        elif _hex(case.accepted_by) == _hex(sender):\n            problem = "this side accepted the judgment; an acceptance is not taken back"\n', ''),
    ("settlement ignores the appeal window", '        if not appealed and not accepted and _window_open(str(case.judged_at), _now(), APPEAL_DAYS):', '        if False:'),
    ("the winner may accept for the loser", '        if not self._may_appeal(case, sender):\n            _fail("the side that won has nothing to accept; the losing side does")\n', ''),
    ("a refused open keeps the money", '        if problem:\n            if value > u256(0):\n                _Payee(sender).emit_transfer(value=value)\n            return json.dumps({"ok": False, "reason": problem + "; your funds were returned"})\n        self.cases[case_id] = Case(', '        if problem:\n            return json.dumps({"ok": False, "reason": problem + "; your funds were returned"})\n        self.cases[case_id] = Case('),
    ("a refused appeal keeps the bond", '        if problem:\n            if value > u256(0):\n                _Payee(sender).emit_transfer(value=value)\n            return json.dumps({"ok": False, "reason": problem + "; your funds were returned"})\n        case.appellant = sender', '        if problem:\n            return json.dumps({"ok": False, "reason": problem + "; your funds were returned"})\n        case.appellant = sender'),
    ("the bond always returns to the appellant", '            if moved:\n                _Payee(case.appellant).emit_transfer(value=u256(bond)); bond_to = "appellant"', '            if True:\n                _Payee(case.appellant).emit_transfer(value=u256(bond)); bond_to = "appellant"'),
    ("inconclusive pays the payee everything", '    percent = 50 if share == INCONCLUSIVE else int(share)', '    percent = 100 if share == INCONCLUSIVE else int(share)'),
    ("a window with no clock is closed", '    if elapsed is None:\n        return True', '    if elapsed is None:\n        return False'),
    ("a settled case can be settled again", '        if case.status != STATUS_JUDGED:\n            _fail("nothing to settle: the case is " + str(case.status))\n', ''),
    ("filing after judgment is allowed", '        if case.status not in (STATUS_FUNDED, STATUS_DISPUTED):\n            _fail("this case has already been judged; the way to add to it is an appeal")\n', ''),
]


def _fresh_env(**extra):
    env = dict(os.environ, PYTHONDONTWRITEBYTECODE="1")
    env.update(extra)
    return env


def run(mutant: pathlib.Path) -> str:
    out = subprocess.run(PYTEST, env=_fresh_env(SPLIT_SOURCE=str(mutant)), capture_output=True, text=True, cwd=ROOT)
    if out.returncode == 0:
        return ""
    text = out.stdout + out.stderr
    if "error during collection" in text or "IndentationError" in text or "SyntaxError" in text:
        raise RuntimeError("the mutant does not even import; that is a broken anchor, not a killed defence:\n" + text[-600:])
    m = re.search(r"FAILED tests/test_pure\.py::(\S+)", text)
    if not m:
        raise RuntimeError("a test failed but its name could not be read:\n" + text[-800:])
    return m.group(1)


def main() -> int:
    baseline = subprocess.run(PYTEST, env=_fresh_env(), capture_output=True, text=True, cwd=ROOT)
    if baseline.returncode != 0:
        print("the unmutated suite does not pass; a mutation table over a failing suite proves nothing"); print((baseline.stdout + baseline.stderr)[-600:]); return 3
    rows, escaped = [], []
    with tempfile.TemporaryDirectory() as tmp:
        for name, old, new in MUTATIONS:
            if SRC.count(old) != 1:
                print(f"  ! anchor not found exactly once ({SRC.count(old)}): {name}"); return 2
            path = pathlib.Path(tmp) / f"split_{len(rows) + len(escaped)}.py"; path.write_text(SRC.replace(old, new), encoding="utf-8")
            killer = run(path); (rows if killer else escaped).append((name, killer))
            print(f"  {'killed ' if killer else 'ESCAPED'}  {name}" + (f"  ← {killer}" if killer else ""))
    if escaped:
        print(f"\n{len(escaped)} mutant(s) escaped; no table written."); return 1
    table = ["# Mutations", "", f"{len(rows)} defences in `contracts/split.py`, each removed or inverted in turn, and the test that failed because of it. "
             "Generated by `tools/mutate.py`; it refuses to write this file if any mutant survives, or if the unmutated suite is not green.", "",
             "| defence removed | killed by |", "|---|---|"] + [f"| {n} | `{k}` |" for n, k in rows] + [""]
    (ROOT / "tests" / "MUTATIONS.md").write_text("\n".join(table), encoding="utf-8")
    print(f"\n{len(rows)} / {len(rows)} killed · tests/MUTATIONS.md written"); return 0


if __name__ == "__main__":
    sys.exit(main())
