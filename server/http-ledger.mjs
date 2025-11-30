import http from "http";
import fs from "fs";
import path from "path";
import { URL } from "url";
import {
  appendLedgerEntry,
  collectLedgerEntries,
  resolveLedgerFile,
} from "./ledger-append.mjs";

const ROOT = process.cwd();
const DASHBOARD_DIR = path.join(ROOT, "dashboard");
const SNAPSHOT_DIR = path.join(ROOT, "ledger", "snapshots");
const LEDGER_API_KEY = process.env.LEDGER_API_KEY;
const PORT = Number.parseInt(process.env.LEDGER_PORT ?? "4100", 10);

const MIME_MAP = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function notFound(res, message = "Not Found") {
  sendJson(res, 404, { error: message });
}

function requireAuth(req, res, searchParams) {
  if (!LEDGER_API_KEY) {
    return true;
  }
  const bearer = req.headers.authorization;
  const headerKey = req.headers["x-api-key"];
  const queryKey = searchParams?.get("apiKey");
  const token =
    (bearer && bearer.startsWith("Bearer ")
      ? bearer.slice("Bearer ".length)
      : null) ??
    headerKey ??
    queryKey;
  if (token === LEDGER_API_KEY) {
    return true;
  }
  res.statusCode = 401;
  res.setHeader("WWW-Authenticate", "Bearer");
  sendJson(res, 401, { error: "Unauthorized" });
  return false;
}

function safeParseJson(body) {
  try {
    return { ok: true, value: JSON.parse(body) };
  } catch (err) {
    return { ok: false, error: err };
  }
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 5 * 1024 * 1024) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function handleAppend(req, res) {
  const raw = await readRequestBody(req);
  const parsed = safeParseJson(raw || "{}");
  if (!parsed.ok) {
    sendJson(res, 400, { error: "Invalid JSON body" });
    return;
  }
  try {
    const result = appendLedgerEntry(parsed.value);
    sendJson(res, 201, { id: result.id, urn: result.urn, entry: result.entry });
  } catch (err) {
    sendJson(res, 400, { error: err.message });
  }
}

function parseLedgerFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function handleGetLedger(res, id) {
  const filePath = resolveLedgerFile(id);
  if (!filePath) {
    notFound(res, "Ledger entry not found");
    return;
  }
  try {
    const entry = parseLedgerFile(filePath);
    sendJson(res, 200, entry);
  } catch (err) {
    sendJson(res, 500, { error: `Failed to read ledger entry: ${err.message}` });
  }
}

function handleSearch(res, searchParams) {
  const q = searchParams.get("q")?.toLowerCase() ?? null;
  const subject = searchParams.get("subject");
  const event = searchParams.get("event");
  const limit = Number.parseInt(searchParams.get("limit") ?? "100", 10);

  try {
    const entries = collectLedgerEntries()
      .map((record) => {
        try {
          return {
            id: record.id,
            entry: parseLedgerFile(record.path),
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => Number.parseInt(b.id, 10) - Number.parseInt(a.id, 10));

    const filtered = entries.filter(({ entry }) => {
      if (subject && entry.subject !== subject) return false;
      if (event && entry.event !== event) return false;
      if (q) {
        const haystack = [entry.urn, entry.subject, entry.event]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    sendJson(res, 200, {
      total: filtered.length,
      limit,
      items: filtered.slice(0, Number.isFinite(limit) ? limit : filtered.length),
    });
  } catch (err) {
    sendJson(res, 500, { error: `Failed to search ledger: ${err.message}` });
  }
}

function handleSnapshots(res) {
  if (!fs.existsSync(SNAPSHOT_DIR)) {
    sendJson(res, 200, { items: [] });
    return;
  }
  try {
    const items = fs
      .readdirSync(SNAPSHOT_DIR, { withFileTypes: true })
      .filter((f) => f.isFile() && f.name.endsWith(".json"))
      .map((f) => {
        const fullPath = path.join(SNAPSHOT_DIR, f.name);
        return parseLedgerFile(fullPath);
      });
    sendJson(res, 200, { items });
  } catch (err) {
    sendJson(res, 500, { error: `Failed to load snapshots: ${err.message}` });
  }
}

function handleSemanticLoops(res) {
  const fallbackPath = path.join(ROOT, "reports", "semantic-loops.json");
  if (fs.existsSync(fallbackPath)) {
    try {
      const data = parseLedgerFile(fallbackPath);
      sendJson(res, 200, { items: data });
      return;
    } catch (err) {
      sendJson(res, 500, { error: `Failed to read semantic loops: ${err.message}` });
      return;
    }
  }
  sendJson(res, 200, { items: [] });
}

function serveFile(res, filePath) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    notFound(res);
    return;
  }

  const ext = path.extname(filePath);
  const mime = MIME_MAP[ext] ?? "application/octet-stream";
  res.statusCode = 200;
  res.setHeader("Content-Type", mime);
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
  stream.on("error", () => {
    sendJson(res, 500, { error: "Failed to read file" });
  });
}

function serveDashboard(res, pathname) {
  const safePath = pathname === "/dashboard" ? "/dashboard/index.html" : pathname;
  const relativePath = safePath.replace("/dashboard", "").replace(/^\/+/, "");
  const target = relativePath
    ? path.join(DASHBOARD_DIR, relativePath)
    : path.join(DASHBOARD_DIR, "index.html");
  const normalized = path.normalize(target);
  if (!normalized.startsWith(DASHBOARD_DIR)) {
    notFound(res);
    return;
  }
  serveFile(res, normalized);
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
  const { pathname, searchParams } = parsedUrl;

  if (pathname.startsWith("/api/")) {
    if (!requireAuth(req, res, searchParams)) {
      return;
    }
  }

  if (req.method === "POST" && pathname === "/api/ledger/append") {
    await handleAppend(req, res);
    return;
  }

  if (req.method === "GET" && pathname === "/api/ledger/search") {
    handleSearch(res, searchParams);
    return;
  }

  if (req.method === "GET" && pathname === "/api/ledger/snapshots") {
    handleSnapshots(res);
    return;
  }

  if (req.method === "GET" && pathname.startsWith("/api/ledger/")) {
    const id = pathname.replace("/api/ledger/", "");
    handleGetLedger(res, id);
    return;
  }

  if (req.method === "GET" && pathname === "/api/semantic-loops") {
    handleSemanticLoops(res);
    return;
  }

  if (req.method === "GET" && (pathname === "/dashboard" || pathname === "/dashboard/")) {
    serveDashboard(res, "/dashboard/index.html");
    return;
  }

  if (req.method === "GET" && pathname.startsWith("/dashboard/")) {
    serveDashboard(res, pathname);
    return;
  }

  if (req.method === "GET" && pathname === "/") {
    sendJson(res, 200, { status: "ok", dashboard: "/dashboard" });
    return;
  }

  notFound(res);
});

server.listen(PORT, () => {
  console.log(`Civic Ledger HTTP daemon listening on http://localhost:${PORT}`);
});

