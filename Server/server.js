// server/server.js
// Competitions aggregator: RSS + HTML scrapers + Puppeteer fallback + debug endpoints

const express = require("express")
const fetch = require("node-fetch")
const Parser = require("rss-parser")
const cheerio = require("cheerio")
const fs = require("fs")
const path = require("path")
const cors = require("cors")
const morgan = require("morgan")
const helmet = require("helmet")
const puppeteer = require("puppeteer")
const puppeteerExtra = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const allocatorRouter = require("./routes/allocator")
const authRouter = require("./routes/auth")
const http = require('http');
const { initIo } = require('./io'); // new (kept; unused if you prefer other init)
const { Server: IOServer } = require('socket.io');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const connectDB = require('./config/db');
puppeteerExtra.use(StealthPlugin())
console.log('SCRAPER_PROVIDER=', process.env.SCRAPER_PROVIDER, ' key set=', !!process.env.SCRAPER_API_KEY);
const app = express()
app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(morgan("tiny"))
app.use("/api/allocator", allocatorRouter)
app.use("/api/auth", authRouter)

// mount students router (ensure file exists at routes/students.js)
let studentsRouter
try {
  studentsRouter = require("./routes/students")
  app.use("/api/students", studentsRouter)
} catch (e) {
  console.warn("routes/students not found or failed to load; continuing without it.", e.message)
}

const parser = new Parser({ timeout: 15000 })
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
});
app.use(limiter);
const SOURCES_FILE = path.join(__dirname, "sources.json")
let SOURCES = []
try {
  SOURCES = JSON.parse(fs.readFileSync(SOURCES_FILE, "utf8"))
} catch (e) {
  console.error("Error reading sources.json", e)
  SOURCES = []
}

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9"
}

// Simple in-memory cache
let CACHE = { timestamp: 0, data: [], ttlMs: 1000 * 60 * 3 } // 3 minutes

// ---------- Utilities ----------
function uid(prefix = "id") {
  return `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`
}

function normalizeEntry(raw, sourceName) {
  let startDate = raw.startDate || raw.isoDate || raw.pubDate || null
  let endDate = raw.endDate || null
  try { if (startDate) startDate = new Date(startDate).toISOString() } catch (e) {}
  try { if (endDate) endDate = new Date(endDate).toISOString() } catch (e) {}

  return {
    id: raw.id || raw.link || uid("i"),
    title: raw.title || "[no title]",
    url: raw.link || raw.url || null,
    description: raw.contentSnippet || raw.content || raw.description || "",
    startDate,
    endDate,
    source: sourceName,
    location: raw.location || null,
    tags: raw.categories || [],
    raw: raw
  }
}

// ---------- Example cheerio HTML parser (template) ----------
async function exampleHtmlParser(sourceUrl) {
  const res = await fetch(sourceUrl)
  if (!res.ok) throw new Error(`Failed to fetch ${sourceUrl}: ${res.status}`)
  const html = await res.text()
  const $ = cheerio.load(html)
  const items = []
  $(".event-card").each((i, el) => {
    const title = $(el).find(".event-title").text().trim()
    const link = $(el).find("a").attr("href")
    const desc = $(el).find(".event-desc").text().trim()
    const dateText = $(el).find(".event-date").text().trim()
    let startDate = null
    if (dateText) {
      const d = new Date(dateText)
      if (!isNaN(d)) startDate = d.toISOString()
    }
    if (title) items.push({ title, link: link ? (link.startsWith("http") ? link : new URL(link, sourceUrl).href) : null, description: desc, startDate })
  })
  return items
}

const HTML_PARSERS = {
  exampleHtmlParser
}

// -------- Scraper-proxy fallback helper (replace existing fetchTextWithHeaders) --------
const SCRAPER_PROVIDER = process.env.SCRAPER_PROVIDER || null
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || null

async function fetchViaScraperApi(targetUrl) {
  if (!SCRAPER_PROVIDER || !SCRAPER_API_KEY) throw new Error('No scraper provider configured')
  if (SCRAPER_PROVIDER === 'scraperapi') {
    // ScraperAPI: rendered response
    const url = `https://api.scraperapi.com?api_key=${encodeURIComponent(SCRAPER_API_KEY)}&url=${encodeURIComponent(targetUrl)}&render=true`
    const r = await fetch(url, { method: 'GET' })
    const text = await r.text()
    return { status: r.status, body: text, via: 'scraperapi' }
  }
  if (SCRAPER_PROVIDER === 'scrapingbee') {
    // ScrapingBee
    const url = `https://app.scrapingbee.com/api/v1/?api_key=${encodeURIComponent(SCRAPER_API_KEY)}&url=${encodeURIComponent(targetUrl)}&render_js=true`
    const r = await fetch(url, { method: 'GET' })
    const text = await r.text()
    return { status: r.status, body: text, via: 'scrapingbee' }
  }
  // add other providers as needed
  throw new Error('Unknown SCRAPER_PROVIDER: ' + SCRAPER_PROVIDER)
}

async function fetchTextWithHeaders(url, opts = {}) {
  const maxTries = opts.retries || 2
  let lastErr = null
  for (let attempt = 1; attempt <= maxTries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { ...DEFAULT_HEADERS, ...(opts.headers || {}) },
        redirect: "follow",
      })
      const status = res.status
      const body = await res.text()

      // detect cloudflare / challenge pages quickly
      const snippet = (body || "").slice(0, 2000).toLowerCase()
      const isChallenge = status === 403 ||
                          snippet.includes("just a moment") ||
                          snippet.includes("enable javascript and cookies") ||
                          snippet.includes("cloudflare") ||
                          snippet.includes("incapsula")

      if (!isChallenge) {
        return { status, body, headers: res.headers }
      }

      // if provider configured, try proxy render
      if (SCRAPER_PROVIDER && SCRAPER_API_KEY) {
        try {
          console.warn(`Challenge detected for ${url} (status ${status}). Trying ${SCRAPER_PROVIDER} proxy...`)
          const via = await fetchViaScraperApi(url)
          // return the provider payload
          return { status: via.status, body: via.body, provider: via.via }
        } catch (proxyErr) {
          console.warn("Scraper provider failed:", proxyErr.message)
          // continue to retry native fetch attempts (or fallthrough)
        }
      }

      // otherwise return the original response so caller can fallback to Puppeteer
      return { status, body, headers: res.headers }
    } catch (e) {
      lastErr = e
      await new Promise((r) => setTimeout(r, 300 * attempt))
    }
  }
  throw lastErr
}


// then the function:
// ++++ REPLACE THE ENTIRE OLD FUNCTION WITH THIS NEW ONE ++++ (keeps Puppeteer)
async function fetchWithPuppeteer(url, opts = {}) {
  const timeoutMs = opts.timeoutMs || 40000; // Increased timeout
  let browser = null;

  // --- !! FOR DEBUGGING DEVPOST !! ---
  // Change this to true to see what the browser is doing.
  // A browser window will pop up on your server.
 const isDebugging = false;
  // ------------------------------------

  try {
    browser = await puppeteerExtra.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--window-position=0,0',
        '--ignore-certifcate-errors',
        '--ignore-certifcate-errors-spki-list',
        '--user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"'
      ],
      headless: !isDebugging, // Runs with a visible window if isDebugging is true
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    // --- Enhanced Stealth ---
    await page.setExtraHTTPHeaders({
        'accept-language': 'en-US,en;q=0.9',
        'accept-encoding': 'gzip, deflate, br',
    });
    await page.setViewport({ width: 1366, height: 768 });
    // Bypass Content-Security-Policy, which can interfere with stealth measures
    await page.setBypassCSP(true);

    // Navigate with a more human-like approach
    await page.goto(url, { waitUntil: 'networkidle2', timeout: timeoutMs });
    
    // Final check for content
    await page.waitForSelector('.hackathon-tile, .event-wrapper', { timeout: 15000, visible: true });

    const content = await page.content();
    await browser.close();
    return { ok: true, html: content };

  } catch (err) {
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    // Return a more detailed error
    return { ok: false, error: `Puppeteer failed: ${err.message}` };
  }
}

// Generic Puppeteer-based HTML parser that uses selectors
async function puppeteerHtmlParser(sourceUrl, selectors = {}) {
  const res = await fetchWithPuppeteer(sourceUrl, { timeoutMs: 30000 })
  if (!res.ok) throw new Error('puppeteer fetch failed: ' + (res.error || 'unknown'))
  const $ = cheerio.load(res.html)
  const items = []
  const itemSel = selectors.item || '.event, .hackathon, .listing, .card'
  $(itemSel).each((i, el) => {
    const title = selectors.title ? $(el).find(selectors.title).text().trim() : $(el).find('a').first().text().trim()
    const link = selectors.link ? $(el).find(selectors.link).attr('href') : $(el).find('a').first().attr('href')
    const desc = selectors.desc ? $(el).find(selectors.desc).text().trim() : $(el).find('p').first().text().trim()
    let startDate = null
    if (selectors.date) {
      const dt = $(el).find(selectors.date).text().trim()
      if (dt) {
        const parsed = new Date(dt)
        if (!isNaN(parsed)) startDate = parsed.toISOString()
      }
    }
    if (title) items.push({ title, link: link ? (link.startsWith('http') ? link : new URL(link, sourceUrl).href) : null, description: desc, startDate })
  })
  return items
}

// ---------- Source fetch + parsing logic ----------
async function fetchSource(src) {
  try {
    if (src.type === "rss") {
      try {
        const { status, body } = await fetchTextWithHeaders(src.url, { timeout: 20000, retries: 1 })
        if (status >= 400) {
          console.warn(`Error fetching source ${src.name} Status code ${status}`, (body || '').slice(0, 800))
          // Puppeteer fallback
          const pupp = await fetchWithPuppeteer(src.url)
          if (!pupp.ok) {
            console.warn('Puppeteer fallback failed for', src.name, pupp.error)
            return []
          }
          const preview = pupp.html.slice(0, 2000).toLowerCase()
          if (preview.includes('<rss') || preview.includes('<feed') || preview.includes('<?xml')) {
            try {
              const feed = await parser.parseString(pupp.html)
              return (feed.items || []).map(it => normalizeEntry(it, src.name))
            } catch (e) {
              console.warn('Parser.parseString after puppeteer returned error', e.message)
            }
          }
          if (src.puppeteerSelectors) {
            const parsedItems = await puppeteerHtmlParser(src.url, src.puppeteerSelectors)
            return parsedItems.map(it => normalizeEntry(it, src.name))
          }
          return []
        }
        // parse as RSS from fetched body
        try {
          const feed = await parser.parseString(body)
          return (feed.items || []).map(it => normalizeEntry(it, src.name))
        } catch (parseErr) {
          console.warn(`RSS parse error for ${src.name}:`, parseErr.message)
          // puppeteer fallback if parse fails
          const pupp = await fetchWithPuppeteer(src.url)
          if (pupp.ok) {
            const preview = pupp.html.slice(0, 2000).toLowerCase()
            if (preview.includes('<rss') || preview.includes('<feed') || preview.includes('<?xml')) {
              try {
                const feed2 = await parser.parseString(pupp.html)
                return (feed2.items || []).map(it => normalizeEntry(it, src.name))
              } catch (e) {
                console.warn('Parser.parseString after puppeteer also failed', e.message)
              }
            }
            if (src.puppeteerSelectors) {
              const parsedItems = await puppeteerHtmlParser(src.url, src.puppeteerSelectors)
              return parsedItems.map(it => normalizeEntry(it, src.name))
            }
          }
          return []
        }
      } catch (fetchErr) {
        console.warn('Fetch error for rss source', src.name, fetchErr.message)
        if (src.puppeteerSelectors) {
          try {
            const parsedItems = await puppeteerHtmlParser(src.url, src.puppeteerSelectors)
            return parsedItems.map(it => normalizeEntry(it, src.name))
          } catch (e) {
            console.warn('Puppeteer parse attempt failed', e.message)
            return []
          }
        }
        return []
      }
    } else if (src.type === "html") {
      const parserFn = HTML_PARSERS[src.parser]
      if (!parserFn) {
        console.warn("No parser for", src.parser)
        if (src.puppeteerSelectors) {
          try {
            const parsedItems = await puppeteerHtmlParser(src.url, src.puppeteerSelectors)
            return parsedItems.map(it => normalizeEntry(it, src.name))
          } catch (e) {
            console.warn("Puppeteer html parse failed for", src.name, e.message)
            return []
          }
        }
        return []
      }
      try {
        const rawItems = await parserFn(src.url)
        if (rawItems && rawItems.length > 0) return rawItems.map(it => normalizeEntry(it, src.name))
        if (src.puppeteerSelectors) {
          const parsedItems = await puppeteerHtmlParser(src.url, src.puppeteerSelectors)
          return parsedItems.map(it => normalizeEntry(it, src.name))
        }
        return []
      } catch (e) {
        console.warn("HTML parser error for", src.name, e.message)
        if (src.puppeteerSelectors) {
          try {
            const parsedItems = await puppeteerHtmlParser(src.url, src.puppeteerSelectors)
            return parsedItems.map(it => normalizeEntry(it, src.name))
          } catch (err2) {
            console.warn('Puppeteer + html parse failed', err2.message)
            return []
          }
        }
        return []
      }
    } else {
      console.warn("Unknown source type", src.type)
      return []
    }
  } catch (e) {
    console.warn("Error fetching source", src.name, e.message)
    return []
  }
}

// ---------- Debug endpoints ----------
console.log("Competitions aggregator sources loaded:", SOURCES.map(s => ({ id: s.id, name: s.name, type: s.type, url: s.url })))

app.get("/api/competitions/debug-raw", async (req, res) => {
  const url = req.query.url
  if (!url) return res.status(400).json({ error: "url query param required" })
  try {
    const r = await fetch(url)
    const text = await r.text()
    let headers = {}
    try { headers = r.headers && r.headers.entries ? Object.fromEntries(Array.from(r.headers.entries())) : {} } catch {}
    res.json({ ok: true, status: r.status, headers, bodyPreview: text.slice(0, 2000) })
  } catch (e) {
    res.json({ ok: false, error: e.message })
  }
})

// Replace your entire debug-source function with this one

app.get("/api/competitions/debug-source", async (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: "id query param required" });
  const src = SOURCES.find(s => s.id === id);
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
      // First, check if a specific parser function is defined
      const parserFn = HTML_PARSERS[src.parser];
      if (parserFn) {
        try {
          const rawItems = await parserFn(src.url);
          return res.json({ ok: true, source: src, itemCount: rawItems.length, rawItemsSample: rawItems.slice(0, 10) });
        } catch (e) {
          return res.json({ ok: false, error: e.message });
        }
      }

      // If no parser function, check for puppeteer selectors as a fallback
      if (src.puppeteerSelectors) {
        try {
          const parsedItems = await puppeteerHtmlParser(src.url, src.puppeteerSelectors);
          return res.json({ ok: true, source: src, itemCount: parsedItems.length, rawItemsSample: parsedItems.slice(0, 10) });
        } catch (e) {
          return res.json({ ok: false, error: "puppeteer html parse failed: " + e.message });
        }
      }
      
      // If neither are available, return an error
      return res.json({ ok: false, error: "no html parser or puppeteer selectors configured for " + src.id });
    } else {
      // THIS WAS THE MISSING 'ELSE' BLOCK
      return res.json({ ok: false, error: "unknown source type" });
    }
  } catch (e) {
    // THIS WAS THE MISSING 'CATCH' BLOCK
    console.error("Error debug-source for", id, e);
    return res.json({ ok: false, error: e.message });
  }
}); // <-- AND THESE WERE THE MISSING CLOSING BRACKETS
// ++++ END OF NEW BLOCK ++++)

// ---------- Aggregation endpoint ----------
app.get("/api/competitions", async (req, res) => {
  const q = (req.query.q || "").toLowerCase()
  const upcomingOnly = req.query.upcomingOnly === "true" || req.query.upcomingOnly === "1"
  const limit = Math.min(200, parseInt(req.query.limit || "100", 10))

  if (Date.now() - CACHE.timestamp < CACHE.ttlMs && CACHE.data && CACHE.data.length > 0) {
    let results = CACHE.data
    if (q) results = results.filter(r => (r.title + " " + r.description + " " + (r.tags||[]).join(" ")).toLowerCase().includes(q))
    if (upcomingOnly) results = results.filter(r => !r.startDate || new Date(r.startDate) >= new Date())
    return res.json({ source: "cache", count: results.length, items: results.slice(0, limit) })
  }

  const fetchPromises = SOURCES.map((s) => fetchSource(s))
  const all = await Promise.all(fetchPromises)
  const flattened = all.flat()
  const mapByUrl = new Map()
  for (const it of flattened) {
    const key = it.url || it.title
    if (!mapByUrl.has(key)) mapByUrl.set(key, it)
    else {
      const exist = mapByUrl.get(key)
      exist.tags = Array.from(new Set([...(exist.tags||[]), ...(it.tags||[])]))
      if ((!exist.startDate && it.startDate) || (exist.startDate && it.startDate && new Date(it.startDate) < new Date(exist.startDate))) {
        exist.startDate = it.startDate
      }
    }
  }
  let results = Array.from(mapByUrl.values())

  if (q) results = results.filter(r => (r.title + " " + r.description + " " + (r.tags||[]).join(" ")).toLowerCase().includes(q))
  if (upcomingOnly) results = results.filter(r => !r.startDate || new Date(r.startDate) >= new Date())

  results.sort((a, b) => {
    if (!a.startDate && !b.startDate) return 0
    if (!a.startDate) return 1
    if (!b.startDate) return -1
    return new Date(a.startDate) - new Date(b.startDate)
  })

  CACHE = { timestamp: Date.now(), data: results, ttlMs: CACHE.ttlMs }

  res.json({ source: "live", count: results.length, items: results.slice(0, limit) })
})

// list configured sources
app.get("/api/competitions/sources", (req, res) => {
  res.json(SOURCES.map(s => ({ id: s.id, name: s.name, type: s.type, url: s.url })))
})

// ping
app.get("/api/ping", (req, res) => res.json({ ok: true, time: new Date() }))

// health endpoint
app.get('/api/health', (req, res) => res.json({ ok: true }));

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
    });

    // Make io available in all routes via req.app.get('io') and app.locals.io
    app.set("io", io);
    app.locals.io = io;

    // ---- Mount persisted competitions router *after* io is set ----
    const persistedRouter = require("./routes/competitionsPersisted");
    app.use("/api/competitions", persistedRouter);

    // If the students router wasn't available earlier, ensure it's mounted now (safe guard)
    try {
      if (!studentsRouter) {
        const sr = require("./routes/students")
        app.use("/api/students", sr)
      }
    } catch (e) {
      // ignore if not present
    }

    // ---- WebSocket events ----
    io.on("connection", (socket) => {
      console.log("✅ Socket connected:", socket.id);

      socket.on("disconnect", () => {
        console.log("❌ Socket disconnected:", socket.id);
      });
    });

    // ---- Add CSV import endpoint (backend support for Import CSV button) ----
    try {
      // Check if a students import endpoint isn't already provided by routes/students
      const User = require("../models/User")
      app.post("/api/students/importcsv", async (req, res) => {
        try {
          const rows = req.body.rows || []
          if (!Array.isArray(rows)) return res.status(400).json({ ok: false, error: "rows must be an array" })
          let created = 0
          for (const r of rows) {
            if (!r.email) continue
            const existing = await User.findOne({ email: (r.email || "").toLowerCase() })
            if (existing) continue
            const u = new User({
              name: r.name || (r.email || "").split("@")[0],
              email: (r.email || "").toLowerCase(),
              skills: Array.isArray(r.skills) ? r.skills : (typeof r.skills === "string" ? r.skills.split(",").map(s=>s.trim()).filter(Boolean) : []),
              role: "student"
            })
            await u.save()
            created++
          }
          // emit update
          try { if (app.locals && app.locals.io) app.locals.io.emit("students:updated") } catch (e) {}
          res.json({ ok: true, created })
        } catch (e) {
          console.error("Import CSV failed:", e)
          res.status(500).json({ ok: false, error: e.message })
        }
      })
    } catch (e) {
      console.warn("Failed to install importcsv endpoint:", e.message)
    }

    // ---- Start the server ----
    server.listen(PORT, () =>
      console.log(`✅ Competitions aggregator + API running on port ${PORT}`)
    );
  } catch (error) {
    console.error("Failed to connect to MongoDB and start server:", error);
    process.exit(1);
  }
})();
