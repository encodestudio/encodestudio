// Creates the tables if they don't exist yet. Never alters or drops anything.
import fs from "node:fs/promises";
import path from "node:path";
import { ROOT_DIR } from "../src/config.js";
import { pool } from "../src/db.js";

const sql = await fs.readFile(path.join(ROOT_DIR, "schema.sql"), "utf8");
const statements = sql
  .replace(/^\s*--.*$/gm, "")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

try {
  for (const statement of statements) await pool.query(statement);
  console.log("Schema is up to date.");
} finally {
  await pool.end();
}
