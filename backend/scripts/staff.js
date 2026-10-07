// Manage lead-manager portal accounts (replaces `manage.py createsuperuser`).
//
//   npm run staff -- add <username> [--email you@x.com] [--name "First Last"] [--superuser]
//   npm run staff -- password <username>
//   npm run staff -- disable <username>
//   npm run staff -- enable <username>
//   npm run staff -- list
import readline from "node:readline";
import { parseArgs } from "node:util";
import { pool, query } from "../src/db.js";
import { USER_TABLE, findUserByUsername, hashPassword } from "../src/auth.js";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    email: { type: "string", default: "" },
    name: { type: "string", default: "" },
    superuser: { type: "boolean", default: false },
  },
});
const [command, username] = positionals;

async function askNewPassword() {
  if (!process.stdin.isTTY) {
    // Piped input (scripts/CI): first line is the password.
    let input = "";
    for await (const chunk of process.stdin) input += chunk;
    const lines = input.split(/\r?\n/);
    if ((lines[0] || "").length < 8) throw new Error("Password must be at least 8 characters.");
    return lines[0];
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  let muted = false;
  rl._writeToOutput = (s) => {
    if (!muted || /Password/.test(s)) rl.output.write(s); // don't echo typed characters
  };
  const ask = (question) =>
    new Promise((resolve, reject) => {
      rl.once("close", () => reject(new Error("No password entered.")));
      muted = true;
      rl.question(question, (answer) => {
        muted = false;
        rl.output.write("\n");
        resolve(answer);
      });
    });
  try {
    const password = await ask("Password: ");
    if (password.length < 8) throw new Error("Password must be at least 8 characters.");
    if ((await ask("Password (again): ")) !== password) throw new Error("Passwords didn't match.");
    return password;
  } finally {
    rl.close();
  }
}

async function requireUser() {
  if (!username) throw new Error("Username is required.");
  const user = await findUserByUsername(username);
  if (!user) throw new Error(`No user named "${username}".`);
  return user;
}

const commands = {
  async add() {
    if (!username) throw new Error("Username is required.");
    if (await findUserByUsername(username)) throw new Error(`User "${username}" already exists.`);
    const password = await hashPassword(await askNewPassword());
    const [first = "", ...rest] = values.name.trim().split(/\s+/);
    await query(
      `INSERT INTO ${USER_TABLE}
         (password, is_superuser, username, first_name, last_name, email, is_staff, is_active, date_joined)
       VALUES (?, ?, ?, ?, ?, ?, 1, 1, UTC_TIMESTAMP(6))`,
      [password, values.superuser ? 1 : 0, username, first, rest.join(" "), values.email],
    );
    console.log(`Created staff user "${username}".`);
  },
  async password() {
    const user = await requireUser();
    await query(`UPDATE ${USER_TABLE} SET password = ? WHERE id = ?`, [await hashPassword(await askNewPassword()), user.id]);
    console.log(`Password updated for "${username}".`);
  },
  async disable() {
    const user = await requireUser();
    await query(`UPDATE ${USER_TABLE} SET is_active = 0 WHERE id = ?`, [user.id]);
    console.log(`Disabled "${username}".`);
  },
  async enable() {
    const user = await requireUser();
    await query(`UPDATE ${USER_TABLE} SET is_active = 1, is_staff = 1 WHERE id = ?`, [user.id]);
    console.log(`Enabled "${username}" for the lead portal.`);
  },
  async list() {
    const rows = await query(
      `SELECT username, email, is_staff, is_superuser, is_active, last_login FROM ${USER_TABLE} ORDER BY username`,
    );
    console.table(rows.map((r) => ({ ...r, is_staff: !!r.is_staff, is_superuser: !!r.is_superuser, is_active: !!r.is_active })));
  },
};

try {
  const run = commands[command];
  if (!run) throw new Error(`Usage: npm run staff -- <${Object.keys(commands).join("|")}> [username]`);
  await run();
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
