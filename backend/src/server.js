import { config } from "./config.js";
import { createApp } from "./app.js";
import { pool } from "./db.js";
import { migrate } from "./migrate.js";

const server = createApp().listen(config.port, () => {
  console.log(`Encode Studio server listening on http://localhost:${config.port}`);
});

// Bring the schema up to date. The site keeps serving even if MySQL is down;
// API calls will fail until it's reachable and the server is restarted.
migrate()
  .then((applied) => {
    console.log(`Connected to MySQL ${config.db.database}@${config.db.host}`);
    if (applied.length) console.log(`Applied migrations: ${applied.join(", ")}`);
  })
  .catch((err) => console.error("Database migration failed:", err.message));

function shutdown() {
  server.close(() => pool.end().finally(() => process.exit(0)));
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
