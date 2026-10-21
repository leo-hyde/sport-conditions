// A tiny Cloudflare Worker (a small program Cloudflare runs for free) that
// fetches live airport weather reports (METARs) for the app.
//
// Why it's needed: aviationweather.gov doesn't let web pages fetch its data
// directly (no "CORS" permission), but a server can. This Worker fetches it,
// adds that permission, and passes it on.
//
// It only fetches METARs, only for a map area, and caches answers for
// 5 minutes, so it can't be used as a general proxy for other websites.
//
// Use:  https://<your-worker>.workers.dev/metar?bbox=49.9,-6.4,51.2,-4.0
//       (south, west, north, east)

const CACHE_SECONDS = 300;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
    };

    if (url.pathname !== "/metar") {
      return new Response("Not found", { status: 404, headers: cors });
    }

    // Only allow four numbers: south, west, north, east.
    const bbox = url.searchParams.get("bbox") || "";
    const numbers = bbox.split(",").map(Number);
    if (numbers.length !== 4 || numbers.some(n => !Number.isFinite(n))) {
      return new Response("bbox must be south,west,north,east", { status: 400, headers: cors });
    }

    // Answer from Cloudflare's cache if we fetched this recently.
    const cache = caches.default;
    const cached = await cache.match(request);
    if (cached) return cached;

    const source = "https://aviationweather.gov/api/data/metar?format=json&bbox=" +
      numbers.map(n => n.toFixed(2)).join(",");
    const upstream = await fetch(source, { headers: { "User-Agent": "sport-conditions-app" } });
    const response = new Response(upstream.body, {
      status: upstream.status,
      headers: {
        ...cors,
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${CACHE_SECONDS}`,
      },
    });
    if (upstream.ok) ctx.waitUntil(cache.put(request, response.clone()));
    return response;
  },
};
