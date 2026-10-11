// Manage lead-manager portal accounts in D1 (replaces `manage.py createsuperuser`).
// Add --remote to change the production database; without it the local dev
// database (`npm run dev`) is used.
//
//   npm run staff -- add <username> [--email you@x.com] [--name "First Last"] [--superuser] [--remote]
//   npm run staff -- password <username> [--remote]
//   npm run staff -- disable <username> [--remote]
//   npm run staff -- enable <username> [--remote]
//   npm run staff -- list [--remote]
import readline from "node:readline";
import { parseArgs } from "node:util";
import { hashPassword } from "../src/passwords.js";
import { d1, sqlValue } from "./d1.js";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    email: { type: "string", default: "" },
    name: { type: "string", default: "" },
    superuser: { type: "boolean", default: false },
    remote: { type: "boolean", default: false },
  },
});
const [command, username] = positionals;
const run = (sql) => d1(sql, { remote: values.remote });
const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

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

function findUser(name) {
  return run(`SELECT * FROM auth_user WHERE username = ${sqlValue(name)}`)[0] || null;
}

function requireUser() {
  if (!username) throw new Error("Username is required.");
  const user = findUser(username);
  if (!user) throw new Error(`No user named "${username}".`);
  return user;
}

const commands = {
  async add() {
    if (!username) throw new Error("Username is required.");
    if (findUser(username)) throw new Error(`User "${username}" already exists.`);
    const password = await hashPassword(await askNewPassword());
    const [first = "", ...rest] = values.name.trim().split(/\s+/);
    run(
      `INSERT INTO auth_user
         (password, is_superuser, username, first_name, last_name, email, is_staff, is_active, date_joined)
       VALUES (${[password, values.superuser ? 1 : 0, username, first, rest.join(" "), values.email].map(sqlValue).join(", ")}, 1, 1, ${NOW})`,
    );
    console.log(`Created staff user "${username}".`);
  },
  async password() {
    const user = requireUser();
    const password = await hashPassword(await askNewPassword());
    run(`UPDATE auth_user SET password = ${sqlValue(password)} WHERE id = ${user.id}`);
    console.log(`Password updated for "${username}".`);
  },
  async disable() {
    const user = requireUser();
    run(`UPDATE auth_user SET is_active = 0 WHERE id = ${user.id}`);
    console.log(`Disabled "${username}".`);
  },
  async enable() {
    const user = requireUser();
    run(`UPDATE auth_user SET is_active = 1, is_staff = 1 WHERE id = ${user.id}`);
    console.log(`Enabled "${username}" for the lead portal.`);
  },
  async list() {
    const rows = run("SELECT username, email, is_staff, is_superuser, is_active, last_login FROM auth_user ORDER BY username");
    console.table(rows.map((r) => ({ ...r, is_staff: !!r.is_staff, is_superuser: !!r.is_superuser, is_active: !!r.is_active })));
  },
};

try {
  const action = commands[command];
  if (!action) throw new Error(`Usage: npm run staff -- <${Object.keys(commands).join("|")}> [username] [--remote]`);
  console.log(`Using the ${values.remote ? "PRODUCTION (remote)" : "local dev"} database.`);
  await action();
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
}
