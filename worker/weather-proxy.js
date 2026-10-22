// A tiny Cloudflare Worker (a small program Cloudflare runs for free) that
// fetches data the app can't fetch directly from a web page:
//
// 1. Live airport weather reports (METARs) from aviationweather.gov, which
//    doesn't give web pages permission ("CORS") to read its data.
// 2. Official UK tide times from the UK Hydrographic Office (Admiralty), which
//    needs a secret key. The key is stored in Cloudflare as a secret called
//    ADMIRALTY_KEY, so it's never in the app's code for anyone to copy.
// 3. Syncing "my sites" and settings between your devices. They're saved in
//    Cloudflare's free key-value storage (a "KV namespace" connected to this
//    Worker as SYNC), under a long private sync code that each device uses.
// 4. Feedback notes from the app's feedback mode, saved as GitHub Issues.
//    Needs two secrets: GITHUB_TOKEN (a GitHub token allowed to write issues
//    on the sport-conditions repository only) and FEEDBACK_CODE (a send code
//    you choose; the app must send the same one, so strangers can't post).
//
// It only fetches these things, and caches answers, so it can't be used as a
// general proxy for other websites.
//
// Use:  /metar?bbox=49.9,-6.4,51.2,-4.0   latest report per airport in an area
//                                          (south, west, north, east)
//       /metar?ids=EGHQ&hours=24          every report from airports, last few hours
//       /tides/stations                   all 607 UK tide stations
//       /tides/events?station=0546        high and low waters for the next 7 days
//       /sync?code=…  (GET)               load the sites and settings saved under a code
//       /sync?code=…  (POST)              save them
//       /feedback     (POST)              { code, title, body } → a new GitHub Issue

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST",
};
const ADMIRALTY = "https://admiraltyapi.azure-api.net/uktidalapi/api/V1/Stations";

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/metar") return await metar(request, url, ctx);
      if (url.pathname === "/tides/stations") return await tideStations(request, env, ctx);
      if (url.pathname === "/tides/events") return await tideEvents(request, url, env, ctx);
      if (url.pathname === "/sync") return await sync(request, url, env);
      if (url.pathname === "/feedback") return await feedback(request, env);
      return reply("Not found", 404);
    } catch (error) {
      // Always answer with CORS, even when something breaks, so the app
      // can see the error instead of a blocked request.
      return reply(`Worker error: ${error.message}`, 500);
    }
  },
};

function reply(text, status) {
  return new Response(text, { status, headers: CORS });
}

// Answers from Cloudflare's cache if we fetched the same thing recently;
// otherwise runs `load`, and caches a good answer for `seconds`.
async function cached(request, ctx, seconds, load) {
  const cache = caches.default;
  const hit = await cache.match(request);
  if (hit) return hit;
  const upstream = await load();
  const response = new Response(upstream.body, {
    status: upstream.status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": `public, max-age=${seconds}` },
  });
  if (upstream.ok) ctx.waitUntil(cache.put(request, response.clone()));
  return response;
}

// ---------- Airport reports ----------

async function metar(request, url, ctx) {
  // Only allow up to 10 four-letter airport codes (like EGHQ), or else four
  // numbers for an area: south, west, north, east.
  let source = "https://aviationweather.gov/api/data/metar?format=json";
  const ids = (url.searchParams.get("ids") || "").toUpperCase();
  if (ids) {
    if (!/^[A-Z0-9]{4}(,[A-Z0-9]{4}){0,9}$/.test(ids)) return reply("ids must be airport codes like EGHQ", 400);
    const hours = Math.min(Math.max(Math.round(Number(url.searchParams.get("hours")) || 1), 1), 24);
    source += `&ids=${ids}&hours=${hours}`;
  } else {
    const numbers = (url.searchParams.get("bbox") || "").split(",").map(Number);
    if (numbers.length !== 4 || numbers.some(n => !Number.isFinite(n))) {
      return reply("Use ?bbox=south,west,north,east or ?ids=EGHQ&hours=24", 400);
    }
    source += "&bbox=" + numbers.map(n => n.toFixed(2)).join(",");
  }
  return cached(request, ctx, 300, () =>
    fetch(source, { headers: { "User-Agent": "sport-conditions-app" } }));
}

// ---------- UK tides (Admiralty) ----------

function admiralty(path, env) {
  return fetch(ADMIRALTY + path, { headers: { "Ocp-Apim-Subscription-Key": env.ADMIRALTY_KEY } });
}

// The station list hardly ever changes, so it's cached for a day, and
// trimmed to just what the app needs: [{ id, name, lat, lon }, …].
async function tideStations(request, env, ctx) {
  if (!env.ADMIRALTY_KEY) return reply("No ADMIRALTY_KEY secret set", 503);
  return cached(request, ctx, 86400, async () => {
    const upstream = await admiralty("", env);
    if (!upstream.ok) return upstream;
    const data = await upstream.json();
    const stations = data.features.map(feature => ({
      id: feature.properties.Id,
      name: feature.properties.Name,
      lon: feature.geometry.coordinates[0],
      lat: feature.geometry.coordinates[1],
    }));
    return new Response(JSON.stringify(stations), { status: 200 });
  });
}

// High and low waters for one station, for the next 7 days, cached for an hour.
async function tideEvents(request, url, env, ctx) {
  if (!env.ADMIRALTY_KEY) return reply("No ADMIRALTY_KEY secret set", 503);
  const station = url.searchParams.get("station") || "";
  if (!/^[0-9A-Za-z]{3,6}$/.test(station)) return reply("station must be a station id like 0546", 400);
  return cached(request, ctx, 3600, () => admiralty(`/${station}/TidalEvents?duration=7`, env));
}

// ---------- Syncing my sites between devices ----------

const MAX_SYNC_BYTES = 200000;  // plenty for hundreds of sites

async function sync(request, url, env) {
  if (!env.SYNC) return reply("No SYNC storage connected to this Worker", 503);
  // Codes are long and random (made by the app), e.g. "kite-4f9c2a7e1b3d5f60".
  const code = url.searchParams.get("code") || "";
  if (!/^[a-z]+-[0-9a-f]{16}$/.test(code)) return reply("Bad sync code", 400);
  const key = `sync:${code}`;

  if (request.method === "GET") {
    const saved = await env.SYNC.get(key);
    return new Response(saved || "null", { headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });
  }
  if (request.method === "POST") {
    // Sent as plain text, so browsers don't need an extra permission check first.
    const body = await request.text();
    if (body.length > MAX_SYNC_BYTES) return reply("Too much data", 413);
    JSON.parse(body);  // throws (→ error 500) if it isn't valid JSON
    await env.SYNC.put(key, body);
    return reply("Saved", 200);
  }
  return reply("Use GET or POST", 405);
}

// ---------- Feedback notes → GitHub Issues ----------

const FEEDBACK_REPO = "leo-hyde/sport-conditions";

async function feedback(request, env) {
  if (request.method !== "POST") return reply("Use POST", 405);
  if (!env.GITHUB_TOKEN || !env.FEEDBACK_CODE) return reply("No GITHUB_TOKEN or FEEDBACK_CODE secret set", 503);
  // Sent as plain text, so browsers don't need an extra permission check first.
  const note = JSON.parse(await request.text());
  if (note.code !== env.FEEDBACK_CODE) return reply("Wrong send code", 403);
  const title = String(note.title || "").slice(0, 200);
  const body = String(note.body || "").slice(0, 20000);
  if (!title) return reply("A note needs a title", 400);

  const upstream = await fetch(`https://api.github.com/repos/${FEEDBACK_REPO}/issues`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json",
      "User-Agent": "sport-conditions-app",  // GitHub refuses requests without one
    },
    body: JSON.stringify({ title, body, labels: ["feedback"] }),
  });
  if (!upstream.ok) return reply(`GitHub said ${upstream.status}: ${await upstream.text()}`, 502);
  const issue = await upstream.json();
  return new Response(JSON.stringify({ number: issue.number, url: issue.html_url }),
    { headers: { ...CORS, "Content-Type": "application/json" } });
}
