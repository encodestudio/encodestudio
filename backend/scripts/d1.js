// Runs SQL against the D1 database through the Wrangler CLI, so local scripts
// can manage the same database the Worker uses.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const wrangler = path.join(ROOT, "node_modules", "wrangler", "bin", "wrangler.js");

/** SQL string literal (D1 --command can't take bound parameters). */
export const sqlValue = (value) =>
  value == null ? "NULL" : typeof value === "number" ? String(value) : `'${String(value).replace(/'/g, "''")}'`;

/** Executes SQL; returns the result rows. `remote` targets production, otherwise the local dev database. */
export function d1(sql, { remote = false, file = false } = {}) {
  const args = [wrangler, "d1", "execute", "DB", remote ? "--remote" : "--local", "--json", "--yes"];
  args.push(file ? `--file=${sql}` : `--command=${sql}`);
  const result = spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || "wrangler d1 execute failed").trim());
  }
  const output = JSON.parse(result.stdout);
  return output.flatMap((r) => r.results ?? []);
}
