// Runs one long job (a job file names the command, env and log) and keeps a
// tiny status port open while it runs, so a dev-server keeper can supervise a
// job that outlives a shell's time budget. Dev only.
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, appendFileSync, writeFileSync } from "node:fs";
const jobFile = process.env.JOB || process.argv[2];
const job = JSON.parse(readFileSync(jobFile, "utf8"));
const log = job.log; writeFileSync(log, `# ${new Date().toISOString()} ${job.cmd.join(" ")}\n`);
let status = "running", code = null;
const child = spawn(job.cmd[0], job.cmd.slice(1), { cwd: job.cwd, env: { ...process.env, ...(job.env || {}) }, stdio: ["ignore", "pipe", "pipe"] });
const sink = (buf) => appendFileSync(log, String(buf).split("\n").filter((l) => !l.startsWith("INFO:")).join("\n"));
child.stdout.on("data", sink); child.stderr.on("data", sink);
child.on("exit", (c) => { code = c; status = "done"; appendFileSync(log, `\n# exit ${c} ${new Date().toISOString()}\n`); });
createServer((_, res) => { res.setHeader("Content-Type", "text/plain"); res.end(`${status} ${code ?? ""}\n`); }).listen(Number(job.port || 8799), "127.0.0.1", () => console.log(`[long-run] ${job.cmd.join(" ")} → ${log}; status on :${job.port || 8799}`));
process.on("SIGTERM", () => { child.kill(); process.exit(0); });
