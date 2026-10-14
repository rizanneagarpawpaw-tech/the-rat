#!/usr/bin/env node
/*
 * ============================================================
 *  Portfolio server — optional Node.js version
 *  Same API as server.ps1 (which needs no Node at all):
 *
 *    GET  /            -> the portfolio (index.html)
 *    GET  /admin.html  -> the admin panel
 *    GET  /api/data    -> contents of db.json
 *    GET  /api/seed    -> contents of db.seed.json
 *    POST /api/data    -> save the database  (x-admin-key header)
 *    POST /api/reset   -> restore db.json from db.seed.json
 *
 *  Run:   node server.js        then open http://localhost:4173
 *  Key:   portfolio-admin       (override with ADMIN_KEY env var)
 *  Port:  4173                  (override with PORT env var)
 * ============================================================
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 4173;
const HOST = process.env.HOST || "127.0.0.1";
const ADMIN_KEY = process.env.ADMIN_KEY || "portfolio-admin";
const DB_FILE = path.join(ROOT, "db.json");
const SEED_FILE = path.join(ROOT, "db.seed.json");
const MAX_BODY = 10 * 1024 * 1024;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".map": "application/json; charset=utf-8",
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
  "Access-Control-Max-Age": "86400",
};

/* -------------------------------------------------- helpers */
function send(res, status, type, body, extra = {}) {
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(body ?? "", "utf8");
  res.writeHead(status, {
    "Content-Type": type,
    "Content-Length": payload.length,
    "Connection": "close",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...CORS,
    ...extra,
  });
  res.end(payload);
}

const sendJSON = (res, status, obj) =>
  send(res, status, "application/json; charset=utf-8", JSON.stringify(obj));

function sendFile(res, fullPath, urlPath) {
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      send(res, 404, "text/plain; charset=utf-8", `404 - ${urlPath} not found`);
      return;
    }
    const ext = path.extname(fullPath).toLowerCase();
    send(res, 200, MIME[ext] || "application/octet-stream", data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

const log = (status, message, color = "\x1b[90m") =>
  console.log(`  ${color}${String(status).padEnd(4)}\x1b[0m  ${message}`);

function ensureDb() {
  if (!fs.existsSync(DB_FILE) && fs.existsSync(SEED_FILE)) {
    fs.copyFileSync(SEED_FILE, DB_FILE);
    console.log("  db.json was missing - created from db.seed.json");
  }
}

/* -------------------------------------------------- routes */
async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathName = decodeURIComponent(url.pathname);
  const method = req.method.toUpperCase();

  if (method === "OPTIONS") {
    send(res, 204, "text/plain", "", CORS);
    log("204", `${method} ${pathName} (preflight)`);
    return;
  }

  // ---------------------------------------------------- API
  if (pathName.startsWith("/api/")) {
    const key = req.headers["x-admin-key"] || "";

    if (method === "GET" && pathName === "/api/data") {
      ensureDb();
      sendFile(res, DB_FILE, pathName);
      log(200, `${method} ${pathName}`, "\x1b[32m");
      return;
    }

    if (method === "GET" && pathName === "/api/seed") {
      sendFile(res, SEED_FILE, pathName);
      log(200, `${method} ${pathName}`, "\x1b[32m");
      return;
    }

    if (method === "POST" && pathName === "/api/data") {
      if (key !== ADMIN_KEY) {
        sendJSON(res, 401, { ok: false, error: "Wrong admin key." });
        log(401, `${method} ${pathName} (bad key)`, "\x1b[31m");
        return;
      }
      try {
        const raw = (await readBody(req)).toString("utf8");
        const parsed = JSON.parse(raw); // validation
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("Root must be a JSON object");
        }
        const tmp = `${DB_FILE}.tmp`;
        fs.writeFileSync(tmp, raw, "utf8");
        fs.renameSync(tmp, DB_FILE);
        sendJSON(res, 200, { ok: true, savedAt: new Date().toISOString() });
        log(200, `${method} ${pathName} (database saved)`, "\x1b[32m");
      } catch (err) {
        sendJSON(res, 400, { ok: false, error: `Invalid JSON: ${err.message}` });
        log(400, `${method} ${pathName} (invalid JSON)`, "\x1b[31m");
      }
      return;
    }

    if (method === "POST" && pathName === "/api/reset") {
      if (key !== ADMIN_KEY) {
        sendJSON(res, 401, { ok: false, error: "Wrong admin key." });
        log(401, `${method} ${pathName} (bad key)`, "\x1b[31m");
        return;
      }
      fs.copyFileSync(SEED_FILE, DB_FILE);
      sendJSON(res, 200, { ok: true, message: "Database restored from db.seed.json" });
      log(200, `${method} ${pathName} (database reset)`, "\x1b[33m");
      return;
    }

    sendJSON(res, 404, { ok: false, error: `No such endpoint: ${method} ${pathName}` });
    log(404, `${method} ${pathName}`, "\x1b[33m");
    return;
  }

  // ------------------------------------------------ static
  if (method !== "GET" && method !== "HEAD") {
    send(res, 405, "text/plain; charset=utf-8", "405 - method not allowed");
    return;
  }

  let rel = pathName.replace(/^\/+/, "");
  if (rel === "" || rel.endsWith("/")) rel += "index.html";

  const full = path.resolve(ROOT, rel);
  if (!full.startsWith(path.resolve(ROOT) + path.sep) && full !== path.resolve(ROOT)) {
    send(res, 403, "text/plain; charset=utf-8", "403 - outside of the site root");
    log(403, `${method} ${pathName} (traversal blocked)`, "\x1b[31m");
    return;
  }

  fs.stat(full, (err, stat) => {
    if (!err && stat.isDirectory()) {
      sendFile(res, path.join(full, "index.html"), pathName);
      return;
    }
    sendFile(res, full, pathName);
  });
  log(200, `${method} ${pathName}`, "\x1b[32m");
}

/* -------------------------------------------------- start */
ensureDb();

const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    try { sendJSON(res, 500, { ok: false, error: err.message }); } catch { /* socket closed */ }
    log("ERR", err.message, "\x1b[31m");
  });
});

server.listen(PORT, HOST, () => {
  const bar = "+---------------------------------------------------+";
  console.log("");
  console.log("\x1b[35m  " + bar + "\x1b[0m");
  console.log("\x1b[35m  |        A R I A   V A L E   -   P O R T F O L I O |\x1b[0m");
  console.log("\x1b[35m  " + bar + "\x1b[0m");
  console.log("");
  console.log(`  \x1b[36mPortfolio\x1b[0m   http://${HOST}:${PORT}/`);
  console.log(`  \x1b[36mAdmin panel\x1b[0m http://${HOST}:${PORT}/admin.html`);
  console.log(`  \x1b[90mDatabase\x1b[0m    ${DB_FILE}`);
  console.log(`  \x1b[90mAdmin key\x1b[0m    ${ADMIN_KEY}`);
  console.log("");
  console.log("  Press Ctrl+C to stop.");
  console.log("");
});
