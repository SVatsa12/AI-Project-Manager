// server/server.js
// Competitions aggregator: RSS + HTML scrapers + Puppeteer fallback + debug endpoints
// Robusted-up version: improved Puppeteer fetch + tolerant HTML parsing + better logging
// Keeps all existing endpoints and behavior.

const express = require("express");
const fetch = require("node-fetch");
const Parser = require("rss-parser");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const puppeteerExtra = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const allocatorRouter = require("./routes/allocator");
const authRouter = require("./routes/auth");
const projectsRouter = require("./routes/projects");
const http = require("http");
const { Server: IOServer } = require("socket.io");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
require("dotenv").config();
const connectDB = require("./config/db");
const studentsRouter = require("./routes/students");
const chatRouter = require("./routes/chat");

// puppeteer-extra + stealth
puppeteerExtra.use(StealthPlugin());

console.log(
  "SCRAPER_PROVIDER=",
  process.env.SCRAPER_PROVIDER,
  " key set=",
  !!process.env.SCRAPER_API_KEY
);

const app = express();
app.use(helmet());
app.use(express.json({ limit: "64kb" })); 
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.use(cors({
  origin: FRONTEND_ORIGIN,                 // not '*'
  credentials: true,                       // allow cookies/Authorization with credentials: 'include'
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Authorization","Content-Type","Accept","X-Requested-With"],
}));
app.use(express.json());
app.use(morgan("tiny"));
app.use("/api/allocator", allocatorRouter);
app.use("/api/auth", authRouter);
app.use("/api/projects", projectsRouter);

const parser = new Parser({ timeout: 15000 });
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
});
app.use(limiter);

const SOURCES_FILE = path.join(__dirname, "sources.json");
let SOURCES = [];
try {
  SOURCES = JSON.parse(fs.readFileSync(SOURCES_FILE, "utf8"));
} catch (e) {
  console.error("Error reading sources.json", e);
  SOURCES = [];
}

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

// Simple in-memory cache
let CACHE = { timestamp: 0, data: [], ttlMs: 1000 * 60 * 3 }; // 3 minutes

// ---------- Utilities ----------
function uid(prefix = "id") {
  return `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}

function normalizeEntry(raw, sourceName) {
  let startDate = raw.startDate || raw.isoDate || raw.pubDate || null;
  let endDate = raw.endDate || null;
  try {
    if (startDate) startDate = new Date(startDate).toISOString();
  } catch (e) {}
  try {
    if (endDate) endDate = new Date(endDate).toISOString();
  } catch (e) {}

  // Best-effort URL extraction
  const urlCandidate = raw.link || raw.url || raw.linkUrl || raw.guid || null;
  const url = urlCandidate && typeof urlCandidate === "string" ? urlCandidate : null;

  return {
    id: raw.id || url || raw.link || uid("i"),
    title: raw.title || "[no title]",
    url: url,
    description: raw.contentSnippet || raw.content || raw.description || "",
    startDate,
    endDate,
    source: sourceName,
    location: raw.location || null,
    tags: raw.categories || [],
    raw: raw,
  };
}

// ---------- Example cheerio HTML parser (template) ----------
async function exampleHtmlParser(sourceUrl) {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`Failed to fetch ${sourceUrl}: ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const items = [];
  $(".event-card").each((i, el) => {
    const title = $(el).find(".event-title").text().trim();
    const link = $(el).find("a").attr("href");
    const desc = $(el).find(".event-desc").text().trim();
    const dateText = $(el).find(".event-date").text().trim();
    let startDate = null;
    if (dateText) {
      const d = new Date(dateText);
      if (!isNaN(d)) startDate = d.toISOString();
    }
    if (title)
      items.push({
        title,
        link: link ? (link.startsWith("http") ? link : new URL(link, sourceUrl).href) : null,
        description: desc,
        startDate,
      });
  });
  return items;
}

const HTML_PARSERS = {
  exampleHtmlParser,
};

// -------- Scraper-proxy fallback helper --------
const SCRAPER_PROVIDER = process.env.SCRAPER_PROVIDER || null;
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || null;

async function fetchViaScraperApi(targetUrl) {
  if (!SCRAPER_PROVIDER || !SCRAPER_API_KEY) throw new Error("No scraper provider configured");
  if (SCRAPER_PROVIDER === "scraperapi") {
    const url = `https://api.scraperapi.com?api_key=${encodeURIComponent(
      SCRAPER_API_KEY
    )}&url=${encodeURIComponent(targetUrl)}&render=true`;
    const r = await fetch(url, { method: "GET" });
    const text = await r.text();
    return { status: r.status, body: text, via: "scraperapi" };
  }
  if (SCRAPER_PROVIDER === "scrapingbee") {
    const url = `https://app.scrapingbee.com/api/v1/?api_key=${encodeURIComponent(
      SCRAPER_API_KEY
    )}&url=${encodeURIComponent(targetUrl)}&render_js=true`;
    const r = await fetch(url, { method: "GET" });
    const text = await r.text();
    return { status: r.status, body: text, via: "scrapingbee" };
  }
  throw new Error("Unknown SCRAPER_PROVIDER: " + SCRAPER_PROVIDER);
}

async function fetchTextWithHeaders(url, opts = {}) {
  const maxTries = opts.retries || 2;
  let lastErr = null;
  for (let attempt = 1; attempt <= maxTries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { ...DEFAULT_HEADERS, ...(opts.headers || {}) },
        redirect: "follow",
      });
      const status = res.status;
      const body = await res.text();

      // detect cloudflare / challenge pages quickly
      const snippet = (body || "").slice(0, 2000).toLowerCase();
      const isChallenge =
        status === 403 ||
        snippet.includes("just a moment") ||
        snippet.includes("enable javascript and cookies") ||
        snippet.includes("cloudflare") ||
        snippet.includes("incapsula") ||
        snippet.includes("x-amzn-waf-action") ||
        snippet.includes("waf") ||
        snippet.includes("bot verification");

      if (!isChallenge) {
        return { status, body, headers: res.headers };
      }

      // if provider configured, try proxy render
      if (SCRAPER_PROVIDER && SCRAPER_API_KEY) {
        try {
          console.warn(`Challenge detected for ${url} (status ${status}). Trying ${SCRAPER_PROVIDER} proxy...`);
          const via = await fetchViaScraperApi(url);
          return { status: via.status, body: via.body, provider: via.via };
        } catch (proxyErr) {
          console.warn("Scraper provider failed:", proxyErr.message);
        }
      }

      return { status, body, headers: res.headers };
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 300 * attempt));
    }
  }
  throw lastErr;
}

// ++++ Robust Puppeteer fetch + tolerant parsing + enhanced logging + safe cleanup + retries + timeouts + fallback + preview + no strict waitForSelector + multiple selector attempts + generic fallback parsing + optional screenshot (disabled) + respects SCRAPER_PROVIDER + headless control + env overrides + user agent + viewport + CSP bypass + extra headers + small delay for JS render + error context

async function fetchWithPuppeteer(url, opts = {}) {
  const timeoutMs = opts.timeoutMs || 45000;
  const maxRetries = typeof opts.retries === "number" ? opts.retries : 2;
  const debug = !!opts.debug;
  let attempt = 0;
  let browser = null;

  while (attempt < maxRetries) {
    attempt++;
    try {
      if (debug) console.log(`Puppeteer attempt ${attempt} -> ${url}`);
      // allow providing executablePath via env if needed (e.g., chrome-aws-lambda)
      const launchOpts = {
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-infobars",
          "--window-position=0,0",
          "--ignore-certificate-errors",
          "--ignore-certificate-errors-spki-list",
        ],
        headless: process.env.PUPPETEER_HEADLESS !== "false", // allow override
        ignoreHTTPSErrors: true,
      };
      if (process.env.CHROME_EXECUTABLE_PATH) {
        launchOpts.executablePath = process.env.CHROME_EXECUTABLE_PATH;
      }

      browser = await puppeteerExtra.launch(launchOpts);
      const page = await browser.newPage();

      // stealthy headers & UA
      await page.setUserAgent(
        opts.userAgent ||
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
      );
      await page.setExtraHTTPHeaders({
        "accept-language": "en-US,en;q=0.9",
      });
      await page.setViewport({ width: 1366, height: 768 });
      await page.setBypassCSP(true);

      // navigation
      await page.goto(url, { waitUntil: "networkidle2", timeout: timeoutMs });

      // small pause for client-side rendering
      await new Promise(r => setTimeout(r, 1000));

      // get content
      const html = await page.content();

      // close browser cleanly
      try {
        await browser.close();
      } catch (e) {
        // ignore
      }
      return { ok: true, html, via: "puppeteer", attempt };
    } catch (err) {
      // ensure browser closed
      if (browser) {
        try {
          await browser.close();
        } catch (e) {}
      }
      const errMsg = err && err.message ? err.message : String(err);
      // If it's a fatal puppeteer error and we've exhausted retries, return failure with message
      if (attempt >= maxRetries) {
        return { ok: false, error: `Puppeteer failed: ${errMsg}`, attempt };
      }
      // otherwise, wait a bit and retry
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }

  return { ok: false, error: "Puppeteer unknown failure" };
}

// Generic Puppeteer-based HTML parser that uses selectors with tolerant fallbacks
async function puppeteerHtmlParser(sourceUrl, selectors = {}) {
  // fetch page HTML via puppeteer (robust version)
  const res = await fetchWithPuppeteer(sourceUrl, { timeoutMs: 35000, retries: 2 });
  if (!res.ok) throw new Error("puppeteer fetch failed: " + (res.error || "unknown"));
  const html = res.html;
  const $ = cheerio.load(html);

  const items = [];

  // build list of item selectors to try
  const candidateItemSelectors = [];
  if (selectors.item) candidateItemSelectors.push(selectors.item);
  candidateItemSelectors.push(".event, .event-card, .hackathon, .hackathon-tile, .listing, .card, article, li, .result, .project");

  // Normalize a helper for extracting text and link
  function getText(el, sel) {
    try {
      return sel ? $(el).find(sel).text().trim() : $(el).text().trim();
    } catch (e) {
      return "";
    }
  }
  function getLink(el, sel) {
    try {
      const attr = sel ? $(el).find(sel).attr("href") : $(el).find("a").first().attr("href");
      if (!attr) return null;
      return attr.startsWith("http") ? attr : new URL(attr, sourceUrl).href;
    } catch (e) {
      return null;
    }
  }
  function getImage(el, sel) {
    try {
      const img = sel ? $(el).find(sel) : $(el).find("img").first();
      const src = img.attr("src") || img.attr("data-src") || img.attr("data-lazy-src");
      if (!src) return null;
      return src.startsWith("http") ? src : new URL(src, sourceUrl).href;
    } catch (e) {
      return null;
    }
  }

  // Try each candidate selector until we find items
  let found = false;
  for (const sel of candidateItemSelectors) {
    const els = $(sel);
    if (els.length > 0) {
      els.each((i, el) => {
        const title = selectors.title ? $(el).find(selectors.title).text().trim() : getText($(el).find("h1,h2,h3") || $(el).find("a").first());
        const link = selectors.link ? getLink(el, selectors.link) : getLink(el, null);
        const desc = selectors.desc ? $(el).find(selectors.desc).text().trim() : getText($(el).find("p").first());
        const image = selectors.image ? getImage(el, selectors.image) : getImage(el, null);
        let startDate = null;
        if (selectors.date) {
          const dt = $(el).find(selectors.date).text().trim();
          if (dt) {
            const parsed = new Date(dt);
            if (!isNaN(parsed)) startDate = parsed.toISOString();
          }
        }
        if (title && title.length > 3 && !title.includes("{fill:") && !title.includes(".cls-")) {
          items.push({ title, link, description: desc, startDate, image });
        }
      });
      if (items.length > 0) {
        found = true;
        break;
      }
    }
  }

  // If no items found, fallback to scanning top-level anchors and headings
  if (!found) {
    $("a").each((i, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr("href");
      if (text && href && text.length > 8 && items.length < 200) {
        const link = href.startsWith("http") ? href : new URL(href, sourceUrl).href;
        items.push({ title: text, link, description: "", startDate: null });
      }
    });
  }

  // Deduplicate by link/title
  const dedup = [];
  const seen = new Set();
  for (const it of items) {
    const key = (it.link || it.title || "").toString();
    if (!seen.has(key)) {
      seen.add(key);
      dedup.push(it);
    }
  }

  return dedup;
}

// ---------- Source fetch + parsing logic ----------
async function fetchSource(src) {
  try {
    if (src.type === "rss") {
      try {
        const { status, body } = await fetchTextWithHeaders(src.url, { timeout: 20000, retries: 1 });
        if (status >= 400) {
          console.warn(`Error fetching source ${src.name} Status code ${status}`, (body || "").slice(0, 800));
          // Puppeteer fallback
          const pupp = await fetchWithPuppeteer(src.url, { timeoutMs: 30000, retries: 2 });
          if (!pupp.ok) {
            console.warn("Puppeteer fallback failed for", src.name, pupp.error);
            return [];
          }
          const preview = (pupp.html || "").slice(0, 2000).toLowerCase();
          if (preview.includes("<rss") || preview.includes("<feed") || preview.includes("<?xml")) {
            try {
              const feed = await parser.parseString(pupp.html);
              return (feed.items || []).map((it) => normalizeEntry(it, src.name));
            } catch (e) {
              console.warn("Parser.parseString after puppeteer returned error", e.message);
            }
          }
          if (src.puppeteerSelectors) {
            const parsedItems = await puppeteerHtmlParser(src.url, src.puppeteerSelectors);
            return parsedItems.map((it) => normalizeEntry(it, src.name));
          }
          return [];
        }
        // parse as RSS from fetched body
        try {
          const feed = await parser.parseString(body);
          return (feed.items || []).map((it) => normalizeEntry(it, src.name));
        } catch (parseErr) {
          console.warn(`RSS parse error for ${src.name}:`, parseErr.message);
          // puppeteer fallback if parse fails
          const pupp = await fetchWithPuppeteer(src.url, { timeoutMs: 30000, retries: 2 });
          if (pupp.ok) {
            const preview = (pupp.html || "").slice(0, 2000).toLowerCase();
            if (preview.includes("<rss") || preview.includes("<feed") || preview.includes("<?xml")) {
              try {
                const feed2 = await parser.parseString(pupp.html);
                return (feed2.items || []).map((it) => normalizeEntry(it, src.name));
              } catch (e) {
                console.warn("Parser.parseString after puppeteer also failed", e.message);
              }
            }
            if (src.puppeteerSelectors) {
              const parsedItems = await puppeteerHtmlParser(src.url, src.puppeteerSelectors);
              return parsedItems.map((it) => normalizeEntry(it, src.name));
            }
          }
          return [];
        }
      } catch (fetchErr) {
        console.warn("Fetch error for rss source", src.name, fetchErr.message);
        if (src.puppeteerSelectors) {
          try {
            const parsedItems = await puppeteerHtmlParser(src.url, src.puppeteerSelectors);
            return parsedItems.map((it) => normalizeEntry(it, src.name));
          } catch (e) {
            console.warn("Puppeteer parse attempt failed", e.message);
            return [];
          }
        }
        return [];
      }
    } else if (src.type === "html") {
      const parserFn = HTML_PARSERS[src.parser];
      if (parserFn) {
        try {
          const rawItems = await parserFn(src.url);
          if (rawItems && rawItems.length > 0) return rawItems.map((it) => normalizeEntry(it, src.name));
        } catch (e) {
          console.warn("HTML parser function threw for", src.name, e.message || e);
        }
      }

      // If puppeteer selectors provided, use tolerant puppeteer parser
      if (src.puppeteerSelectors) {
        try {
          const parsedItems = await puppeteerHtmlParser(src.url, src.puppeteerSelectors);
          return parsedItems.map((it) => normalizeEntry(it, src.name));
        } catch (e) {
          console.warn("Puppeteer html parse failed for", src.name, e.message);
          return [];
        }
      }

      console.warn("No parser for", src.parser, "and no puppeteerSelectors for", src.id);
      return [];
    } else {
      console.warn("Unknown source type", src.type);
      return [];
    }
  } catch (e) {
    console.warn("Error fetching source", src && src.name, e && e.message ? e.message : e);
    return [];
  }
}

// ---------- Debug endpoints ----------
console.log(
  "Competitions aggregator sources loaded:",
  SOURCES.map((s) => ({ id: s.id, name: s.name, type: s.type, url: s.url }))
);

app.get("/api/competitions/debug-raw", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "url query param required" });
  try {
    const r = await fetch(url);
    const text = await r.text();
    let headers = {};
    try {
      headers = r.headers && r.headers.entries ? Object.fromEntries(Array.from(r.headers.entries())) : {};
    } catch {}
    res.json({ ok: true, status: r.status, headers, bodyPreview: text.slice(0, 2000) });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.get("/api/competitions/debug-source", async (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: "id query param required" });
  const src = SOURCES.find((s) => s.id === id);
  if (!src) return res.status(404).json({ error: "source not found" });

  try {
    if (src.type === "rss") {
      try {
        const { status, body } = await fetchTextWithHeaders(src.url, { timeout: 20000, retries: 1 });
        if (status >= 400) {
          return res.json({ ok: false, error: `Status ${status}`, bodyPreview: (body || "").slice(0, 1200) });
        }
        try {
          const feed = await parser.parseString(body);
          const items = feed.items || [];
          return res.json({ ok: true, source: src, itemCount: items.length, rawItemsSample: items.slice(0, 5) });
        } catch (e) {
          return res.json({ ok: false, error: "parse error: " + e.message, bodyPreview: body.slice(0, 1200) });
        }
      } catch (e) {
        return res.json({ ok: false, error: "fetch error: " + e.message });
      }
    } else if (src.type === "html") {
      const parserFn = HTML_PARSERS[src.parser];
      if (parserFn) {
        try {
          const rawItems = await parserFn(src.url);
          return res.json({ ok: true, source: src, itemCount: rawItems.length, rawItemsSample: rawItems.slice(0, 10) });
        } catch (e) {
          return res.json({ ok: false, error: e.message });
        }
      }

      if (src.puppeteerSelectors) {
        try {
          const parsedItems = await puppeteerHtmlParser(src.url, src.puppeteerSelectors);
          return res.json({ ok: true, source: src, itemCount: parsedItems.length, rawItemsSample: parsedItems.slice(0, 10) });
        } catch (e) {
          return res.json({ ok: false, error: "puppeteer html parse failed: " + e.message });
        }
      }

      return res.json({ ok: false, error: "no html parser or puppeteer selectors configured for " + src.id });
    } else {
      return res.json({ ok: false, error: "unknown source type" });
    }
  } catch (e) {
    console.error("Error debug-source for", id, e);
    return res.json({ ok: false, error: e.message });
  }
});

// ---------- Aggregation endpoint ----------
app.get("/api/competitions", async (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  const upcomingOnly = req.query.upcomingOnly === "true" || req.query.upcomingOnly === "1";
  const limit = Math.min(200, parseInt(req.query.limit || "100", 10));

  if (Date.now() - CACHE.timestamp < CACHE.ttlMs && CACHE.data && CACHE.data.length > 0) {
    let results = CACHE.data;
    if (q) results = results.filter((r) => (r.title + " " + r.description + " " + (r.tags || []).join(" ")).toLowerCase().includes(q));
    if (upcomingOnly) results = results.filter((r) => !r.startDate || new Date(r.startDate) >= new Date());
    return res.json({ source: "cache", count: results.length, items: results.slice(0, limit) });
  }

  const fetchPromises = SOURCES.map((s) => fetchSource(s));
  const all = await Promise.all(fetchPromises);
  const flattened = all.flat();
  const mapByUrl = new Map();
  for (const it of flattened) {
    const key = it.url || it.title;
    if (!mapByUrl.has(key)) mapByUrl.set(key, it);
    else {
      const exist = mapByUrl.get(key);
      exist.tags = Array.from(new Set([...(exist.tags || []), ...(it.tags || [])]));
      if ((!exist.startDate && it.startDate) || (exist.startDate && it.startDate && new Date(it.startDate) < new Date(exist.startDate))) {
        exist.startDate = it.startDate;
      }
    }
  }
  let results = Array.from(mapByUrl.values());

  if (q) results = results.filter((r) => (r.title + " " + r.description + " " + (r.tags || []).join(" ")).toLowerCase().includes(q));
  if (upcomingOnly) results = results.filter((r) => !r.startDate || new Date(r.startDate) >= new Date());

  results.sort((a, b) => {
    if (!a.startDate && !b.startDate) return 0;
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return new Date(a.startDate) - new Date(b.startDate);
  });

  CACHE = { timestamp: Date.now(), data: results, ttlMs: CACHE.ttlMs };

  res.json({ source: "live", count: results.length, items: results.slice(0, limit) });
});

// list configured sources
app.get("/api/competitions/sources", (req, res) => {
  res.json(SOURCES.map((s) => ({ id: s.id, name: s.name, type: s.type, url: s.url })));
});

// ping
app.get("/api/ping", (req, res) => res.json({ ok: true, time: new Date() }));

// health endpoint
app.get("/api/health", (req, res) => res.json({ ok: true }));

// ==================== SOCKET.IO + SERVER STARTUP ====================

const PORT = process.env.PORT || 4003;

(async () => {
  try {
    console.log("Server connecting to:", process.env.MONGO_URI);
    await connectDB(process.env.MONGO_URI || "mongodb://localhost:27017/gpai");

    // Create HTTP server from express app
    const server = http.createServer(app);

    // Initialize Socket.IO
    const io = new IOServer(server, {
      cors: { origin: true, methods: ["GET", "POST"] },
      transports: ["polling", "websocket"],
    });

    // Make io available in all routes via req.app.get('io') and app.locals.io
    app.set("io", io);
    app.locals.io = io;

    // ---- Mount persisted competitions router *after* io is set ----
    try {
      const persistedRouter = require("./routes/competitionsPersisted");
      app.use("/api/competitions", persistedRouter);
    } catch (err) {
      console.warn("Could not mount competitionsPersisted router:", err.message);
    }

    // If the students router wasn't available earlier, ensure it's mounted now (safe guard)
    try {
      if (!studentsRouter) {
        const sr = require("./routes/students");
        app.use("/api/students", sr);
      } else {
        app.use("/api/students", studentsRouter);
      }
    } catch (e) {
      console.warn("Students router mount warning:", e.message);
    }

    // ---- Migration endpoint: Check for users in old User model and migrate to Enrollment ----
    try {
      const User = require("./models/user");
      const Enrollment = require("./models/Enrollment");

      app.get("/api/admin/migrate-users", async (req, res) => {
        try {
          console.log("[migrate-users] Checking for users in old User collection...");
          
          // Find all users from the old User model
          const oldUsers = await User.find({});
          console.log(`[migrate-users] Found ${oldUsers.length} users in old collection`);

          // Find all users in the Enrollment collection
          const enrollments = await Enrollment.find({});
          const enrollmentEmails = new Set(enrollments.map(e => e.email.toLowerCase()));
          console.log(`[migrate-users] Found ${enrollments.length} users in Enrollment collection`);

          const migrated = [];
          const skipped = [];

          for (const user of oldUsers) {
            if (enrollmentEmails.has(user.email.toLowerCase())) {
              skipped.push(user.email);
              console.log(`[migrate-users] Skipping ${user.email} (already in Enrollment)`);
              continue;
            }

            // Migrate to Enrollment
            const newEnrollment = new Enrollment({
              name: user.name,
              email: user.email,
              passwordHash: user.passwordHash,
              role: user.role || "student",
              skills: [],
              profile: {},
              joinedAt: user.createdAt || new Date(),
            });

            await newEnrollment.save();
            migrated.push(user.email);
            console.log(`[migrate-users] Migrated ${user.email} to Enrollment collection`);
          }

          // Emit students:updated if any students were migrated
          if (migrated.length > 0) {
            try {
              if (app.locals && app.locals.io) {
                app.locals.io.emit("students:updated");
                console.log("[migrate-users] Emitted students:updated event");
              }
            } catch (e) {
              console.warn("[migrate-users] Socket emit failed:", e);
            }
          }

          res.json({
            ok: true,
            migrated: migrated.length,
            skipped: skipped.length,
            details: {
              migrated,
              skipped,
              totalOldUsers: oldUsers.length,
              totalEnrollments: enrollments.length + migrated.length
            }
          });
        } catch (error) {
          console.error("[migrate-users] Error:", error);
          res.status(500).json({ ok: false, error: error.message });
        }
      });
    } catch (e) {
      console.warn("Migration endpoint setup failed:", e.message);
    }

    // ---- WebSocket events ----
    io.on("connection", (socket) => {
      console.log("✅ Socket connected:", socket.id);

      // Listen for project updates from any client
      socket.on("projects:update", (data) => {
        console.log("📊 Broadcasting project update to all clients");
        // Broadcast to all other connected clients (excluding sender)
        socket.broadcast.emit("projects:update", data);
      });

      socket.on("disconnect", () => {
        console.log("❌ Socket disconnected:", socket.id);
      });
    });

    // ---- Add CSV import endpoint (backend support for Import CSV button) ----
    try {
      const User = require("./models/User"); // correct relative path from server.js

      app.post("/api/students/importcsv", async (req, res) => {
        try {
          const rows = req.body.rows || [];
          if (!Array.isArray(rows)) return res.status(400).json({ ok: false, error: "rows must be an array" });

          let created = 0;
          const saltRounds = 10;

          for (const r of rows) {
            try {
              if (!r || !r.email) continue;

              const email = (r.email || "").toLowerCase().trim();
              if (!email) continue;

              const existing = await User.findOne({ email });
              if (existing) continue;

              // generate a random password and hash it
              const plainPassword = Math.random().toString(36).slice(-12); // random 12-char string
              const passwordHash = await bcrypt.hash(plainPassword, saltRounds);

              const u = new User({
                name: r.name || email.split("@")[0],
                email,
                skills: Array.isArray(r.skills)
                  ? r.skills
                  : typeof r.skills === "string"
                  ? r.skills.split(",").map((s) => s.trim()).filter(Boolean)
                  : [],
                role: "student",
                passwordHash, // satisfy schema requirement
                createdBy: "import-csv",
                mustResetPassword: true,
              });

              await u.save();
              created++;

              // optionally — log created user email (avoid logging password/plain)
              console.log(`Imported user: ${email}`);
            } catch (innerErr) {
              console.warn("Failed to import row:", r && r.email, innerErr && innerErr.stack ? innerErr.stack : innerErr);
            }
          }

          // emit update to connected clients (if socket.io present)
          try {
            if (app.locals && app.locals.io) app.locals.io.emit("students:updated");
          } catch (e) {
            console.warn("Socket emit failed:", e && e.message);
          }

          res.json({ ok: true, created });
        } catch (e) {
          console.error("Import CSV failed:", e && e.stack ? e.stack : e);
          res.status(500).json({ ok: false, error: (e && e.message) || "internal error" });
        }
      });
    } catch (e) {
      console.warn("Failed to install importcsv endpoint:", e && e.message ? e.message : e);
    }

    // ---- Start the server ----
    server.listen(PORT, () => console.log(`✅ Competitions aggregator + API running on port ${PORT}`));
  } catch (error) {
    console.error("Failed to connect to MongoDB and start server:", error);
    process.exit(1);
  }
})();


// Rate limiter (global, adjust values in .env)
const rl = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000"),
  max: parseInt(process.env.RATE_LIMIT_MAX || "60"),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, slow down." },
});
app.use(rl);

// Health
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Chat route
app.use("/api/chat", chatRouter);

