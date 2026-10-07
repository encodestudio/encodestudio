// Creates missing tables/columns. Never drops or rewrites existing data.
// (The server also runs this automatically on start.)
import { pool } from "../src/db.js";
import { migrate } from "../src/migrate.js";

try {
  const applied = await migrate();
  console.log(applied.length ? `Applied: ${applied.join(", ")}` : "Schema is up to date.");
} finally {
  await pool.end();
}
