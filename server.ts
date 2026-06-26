import express from "express";
import path from "path";
import http from "http";
import fs from "fs";
import { createServer as createViteServer } from "vite";

// File-based Cache implementation to survive restarts and drastically speed up data fetching
const CACHE_FILE = path.join(process.cwd(), "xtream_cache.json");

interface CacheEntry {
  data: any;
  timestamp: number;
}

let apiCache: { [key: string]: CacheEntry } = {};

// Load cache from disk if it exists
try {
  if (fs.existsSync(CACHE_FILE)) {
    const fileContent = fs.readFileSync(CACHE_FILE, "utf-8");
    apiCache = JSON.parse(fileContent);
    console.log("Successfully loaded Xtream cache from disk. Total cached items:", Object.keys(apiCache).length);
  }
} catch (e: any) {
  console.error("Failed to load cache from disk:", e.message);
}

const CACHE_TTL_MS = {
  info: 12 * 60 * 60 * 1000,       // 12 hours for account info
  categories: 24 * 60 * 60 * 1000, // 24 hours for category list
  series: 24 * 60 * 60 * 1000,     // 24 hours for series list
  seriesInfo: 24 * 60 * 60 * 1000, // 24 hours for individual series seasons/episodes
};

function getFromCache(key: string, ttl: number): any | null {
  const entry = apiCache[key];
  if (entry && Date.now() - entry.timestamp < ttl) {
    console.log(`[CACHE HIT] Returning cached data for key: ${key}`);
    return entry.data;
  }
  return null;
}

function setToCache(key: string, data: any) {
  apiCache[key] = {
    data,
    timestamp: Date.now(),
  };
  // Write cache back to disk asynchronously
  fs.writeFile(CACHE_FILE, JSON.stringify(apiCache, null, 2), "utf-8", (err) => {
    if (err) {
      console.error("Failed to save cache to disk:", err.message);
    } else {
      console.log(`[CACHE SAVE] Saved cache to disk for key: ${key}`);
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Xtream Codes Credentials
  const XTREAM_HOST = "http://vo5px.top";
  const XTREAM_USER = "5252761676";
  const XTREAM_PASS = "6582429481";

  app.use(express.json());

  // API Route: Clear disk cache
  app.post("/api/cache/clear", (req, res) => {
    try {
      apiCache = {};
      if (fs.existsSync(CACHE_FILE)) {
        fs.unlinkSync(CACHE_FILE);
      }
      console.log("[CACHE CLEAR] Disk and memory cache cleared successfully.");
      res.json({ success: true, message: "تم إفراغ الذاكرة المؤقتة وتحديث البيانات بنجاح!" });
    } catch (error: any) {
      console.error("Failed to clear cache:", error.message);
      res.status(500).json({ error: "فشل إفراغ الذاكرة المؤقتة", details: error.message });
    }
  });

  // API Route: Get Server and Account Info (Login details check)
  app.get("/api/info", async (req, res) => {
    const cacheKey = "account_info";
    const cachedData = getFromCache(cacheKey, CACHE_TTL_MS.info);
    if (cachedData) {
      return res.json(cachedData);
    }

    try {
      const url = `${XTREAM_HOST}/player_api.php?username=${XTREAM_USER}&password=${XTREAM_PASS}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setToCache(cacheKey, data);
      res.json(data);
    } catch (error: any) {
      console.error("API /api/info error:", error.message);
      res.status(500).json({ error: "Failed to connect to Xtream server", details: error.message });
    }
  });

  // API Route: Get Series Categories
  app.get("/api/series/categories", async (req, res) => {
    const cacheKey = "series_categories";
    const cachedData = getFromCache(cacheKey, CACHE_TTL_MS.categories);
    if (cachedData) {
      return res.json(cachedData);
    }

    try {
      const url = `${XTREAM_HOST}/player_api.php?username=${XTREAM_USER}&password=${XTREAM_PASS}&action=get_series_categories`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setToCache(cacheKey, data);
      res.json(data);
    } catch (error: any) {
      console.error("API /api/series/categories error:", error.message);
      res.status(500).json({ error: "Failed to fetch series categories", details: error.message });
    }
  });

  // API Route: Get All Series (optionally filterable in client, or proxy with category_id if supported)
  app.get("/api/series/all", async (req, res) => {
    const { category_id } = req.query;
    const cacheKey = `series_list_${category_id || "all"}`;
    const cachedData = getFromCache(cacheKey, CACHE_TTL_MS.series);
    if (cachedData) {
      return res.json(cachedData);
    }

    try {
      let url = `${XTREAM_HOST}/player_api.php?username=${XTREAM_USER}&password=${XTREAM_PASS}&action=get_series`;
      if (category_id) {
        url += `&category_id=${category_id}`;
      }
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setToCache(cacheKey, data);
      res.json(data);
    } catch (error: any) {
      console.error("API /api/series/all error:", error.message);
      res.status(500).json({ error: "Failed to fetch series list", details: error.message });
    }
  });

  // API Route: Get Specific Series Information (Seasons & Episodes)
  app.get("/api/series/info/:seriesId", async (req, res) => {
    const { seriesId } = req.params;
    const cacheKey = `series_info_${seriesId}`;
    const cachedData = getFromCache(cacheKey, CACHE_TTL_MS.seriesInfo);
    if (cachedData) {
      return res.json(cachedData);
    }

    try {
      const url = `${XTREAM_HOST}/player_api.php?username=${XTREAM_USER}&password=${XTREAM_PASS}&action=get_series_info&series_id=${seriesId}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setToCache(cacheKey, data);
      res.json(data);
    } catch (error: any) {
      console.error(`API /api/series/info/${seriesId} error:`, error.message);
      res.status(500).json({ error: "Failed to fetch series info", details: error.message });
    }
  });

  // API Route: Stream Proxy for video content
  // Serves stream through Express, forwarding Range requests to bypass HTTPS/HTTP mixed content issue
  app.get("/api/stream/:episodeId/:extension", (req, res) => {
    const { episodeId, extension } = req.params;
    const targetUrl = `${XTREAM_HOST}/series/${XTREAM_USER}/${XTREAM_PASS}/${episodeId}.${extension}`;

    const parsedUrl = new URL(targetUrl);
    const options: http.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname + parsedUrl.search,
      method: "GET",
      headers: {},
    };

    // Forward range header if the browser sent one (very important for HTML5 video seeking)
    if (req.headers.range) {
      options.headers!["Range"] = req.headers.range;
    }

    const proxyReq = http.request(options, (proxyRes) => {
      // Set status and copy crucial headers
      const statusCode = proxyRes.statusCode || 200;
      res.status(statusCode);

      // Copy headers from proxy target response to browser response
      const headersToForward = [
        "content-type",
        "content-length",
        "content-range",
        "accept-ranges",
        "cache-control",
      ];

      headersToForward.forEach((h) => {
        if (proxyRes.headers[h]) {
          res.setHeader(h, proxyRes.headers[h] as string);
        }
      });

      // Default to video/mp4 if content-type is missing or stream/octet-stream
      if (!res.getHeader("content-type") || res.getHeader("content-type") === "application/octet-stream") {
        res.setHeader("content-type", `video/${extension === "mkv" ? "mp4" : extension}`);
      }

      proxyRes.pipe(res);
    });

    proxyReq.on("error", (err) => {
      console.error("Stream Proxy request error:", err.message);
      if (!res.headersSent) {
        res.status(500).send("Error fetching video stream");
      }
    });

    // If client aborts connection, close proxy request
    req.on("close", () => {
      proxyReq.destroy();
    });

    proxyReq.end();
  });

  // Vite Integration for Serving Client Assets
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start fullstack server:", err);
});
