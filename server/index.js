/* Starts QueuSC. Port: -p 4000 (as in the DCISM PM2 guide), --port 4000, or PORT in .env. Default 3000. */
import { createApp } from "./app.js";
import { pool } from "./db.js";
import { purgeExpiredSessions } from "./auth.js";

function portFromArgs(args) {
  const i = args.findIndex((a) => a === "-p" || a === "--port");
  return i >= 0 ? Number(args[i + 1]) : NaN;
}

const port = portFromArgs(process.argv.slice(2)) || Number(process.env.PORT) || 3000;

await pool.query("SELECT 1").catch((err) => {
  console.error(`Can't reach the database: ${err.message}. Check DB_ settings in .env.`);
  process.exit(1);
});

const server = createApp().listen(port, () => console.log(`QueuSC is running on port ${port}`));

setInterval(() => purgeExpiredSessions().catch(() => {}), 60 * 60 * 1000).unref();

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => pool.end().then(() => process.exit(0))));
}
