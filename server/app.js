/* The Express app: JSON API under /api, and the built React app (dist/) for everything else. */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import { pool } from "./db.js";
import {
  clearFailures, endSession, publicUser, recordFailure, requireUser, startSession, tooManyAttempts, verifyPassword
} from "./auth.js";
import { ApiError, router as student } from "./student.js";
import { faculty, registrar } from "./staff.js";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1); // DCISM serves the subdomain through a proxy; this keeps HTTPS cookies secure.

  const api = express.Router();
  api.use(express.json({ limit: "100kb" }));
  // Writes must send JSON. Together with SameSite cookies, this blocks other sites from posting forms here.
  api.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "DELETE" && !req.is("application/json")) {
      return res.status(415).json({ error: "Send requests as JSON." });
    }
    next();
  });

  api.post("/login", async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const key = `${req.ip}|${email}`;
    if (tooManyAttempts(key)) throw new ApiError(429, "Too many tries. Wait 15 minutes and try again.");
    const [[user]] = await pool.execute(
      "SELECT u.*, p.name AS program_name FROM users u LEFT JOIN programs p ON p.code = u.program_code WHERE u.email = ?", [email]);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      recordFailure(key);
      throw new ApiError(401, "Wrong email or password.");
    }
    clearFailures(key);
    await startSession(req, res, user.id);
    res.json({ user: publicUser(user) });
  });

  api.post("/logout", async (req, res) => {
    await endSession(req, res);
    res.json({ ok: true });
  });

  api.use(requireUser);
  api.get("/me", (req, res) => res.json({ user: publicUser(req.user) }));
  api.use("/faculty", faculty);
  api.use("/registrar", registrar);
  api.use(student);
  api.use((req, res) => res.status(404).json({ error: "Not found." }));

  // Errors: ApiError messages go to the user; anything else is logged and hidden.
  api.use((err, req, res, next) => {
    if (err instanceof ApiError) return res.status(err.status).json({ error: err.message });
    if (err.type === "entity.parse.failed") return res.status(400).json({ error: "That request wasn't valid JSON." });
    console.error(err);
    res.status(500).json({ error: "Something went wrong on the server. Try again." });
  });

  app.use("/api", api);

  if (existsSync(dist)) {
    app.use(express.static(dist, { dotfiles: "deny", index: "index.html", maxAge: "1h" }));
    app.get("/", (req, res) => res.sendFile("index.html", { root: dist }));
  } else {
    app.get("/", (req, res) => res.type("text").send("Run `npm run build` first, then restart the server."));
  }
  app.use((req, res) => res.status(404).type("text").send("Not found"));
  return app;
}
