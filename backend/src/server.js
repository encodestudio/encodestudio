import { config } from "./config.js";
import { createApp } from "./app.js";
import { pool } from "./db.js";

const server = createApp().listen(config.port, () => {
  console.log(`Encode Studio server listening on http://localhost:${config.port}`);
});

pool
  .query("SELECT 1")
  .then(() => console.log(`Connected to MySQL ${config.db.database}@${config.db.host}`))
  .catch((err) => console.error("MySQL connection check failed:", err.message));

function shutdown() {
  server.close(() => pool.end().finally(() => process.exit(0)));
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
