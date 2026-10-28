// Opens the app in a hidden browser with MADE-UP forecasts, waves and tides
// (so it never uses up the free forecast service's daily limit), then saves a
// screenshot and reports any errors. For checking changes quickly.
//
// Needs Node.js and Playwright (Claude's cloud sessions have both).
//
//   node tools/preview.js [options]
//     --sport parakiting|surfing   --view overview|sites|map   --layout days|hours
//     --width 360  --height 700    --dark                       --out shot.png
//     --eval "javascript"          run this in the page afterwards and print the result
//
// The map library comes from unpkg.com; if that's blocked (as in cloud
// sessions), it's downloaded once from npm into tools/.cache instead.

const http = require("http");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const CACHE = path.join(__dirname, ".cache");
const args = Object.fromEntries(process.argv.slice(2).join(" ").split("--").filter(Boolean)
  .map(part => { const [key, ...rest] = part.trim().split(" "); return [key, rest.join(" ") || true]; }));
const opt = {
  sport: args.sport || "parakiting", view: args.view || "overview", layout: args.layout || "days",
  width: Number(args.width || 360), height: Number(args.height || 700), dark: Boolean(args.dark),
  out: args.out || "preview.png", eval: args.eval,
};

function findPlaywright() {
  for (const place of ["playwright", "/opt/node22/lib/node_modules/playwright"]) {
    try { return require(place); } catch { /* try the next place */ }
  }
  throw new Error("Playwright isn't installed (npm install -g playwright)");
}

// ---------- Made-up data: smooth, varied, and the same every run ----------

function hourTimes() {
  const start = new Date(); start.setUTCHours(0, 0, 0, 0);
  return Array.from({ length: 168 }, (_, i) => new Date(start.getTime() + i * 3600e3).toISOString().slice(0, 13) + ":00");
}
function fakeForecast(lat) {
  const time = hourTimes();
  const speed = time.map((_, i) => 13 + 5 * Math.sin(i / 5 + lat * 3));
  return { hourly: { time, wind_speed_10m: speed, wind_gusts_10m: speed.map(s => s + 6),
    wind_direction_10m: time.map((_, i) => (270 + 90 * Math.sin(i / 11 + lat)) % 360), precipitation: time.map((_, i) => (i % 37 < 3 ? 2 : 0)) } };
}
function fakeMarine(lat) {
  const time = hourTimes();
  return { hourly: { time,
    wave_height: time.map((_, i) => 1.0 + 0.6 * Math.sin(i / 9 + lat * 7)),  // about 1.3–5 ft
    wave_period: time.map((_, i) => 8 + 3 * Math.sin(i / 13)),
    wave_direction: time.map(() => 290),
    swell_wave_period: time.map((_, i) => 9 + 4 * Math.sin(i / 13 + lat)),
    swell_wave_direction: time.map((_, i) => (300 + 30 * Math.sin(i / 17)) % 360),
    sea_level_height_msl: time.map((_, i) => 2.5 * Math.sin(i * 2 * Math.PI / 12.42)) } };
}

// ---------- A tiny web server for the app's files ----------

function serve() {
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" };
  const server = http.createServer((request, response) => {
    const file = path.join(ROOT, decodeURIComponent(new URL(request.url, "http://x").pathname));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { response.writeHead(404); return response.end(); }
    response.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(response);
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve(server)));
}

// The map library from npm, if unpkg.com can't be reached.
function cachedLibrary(name, version, file) {
  const folder = path.join(CACHE, `${name}-${version}`);
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
    execSync(`npm pack ${name}@${version} --silent --pack-destination "${CACHE}"`, { stdio: "ignore" });
    execSync(`tar -xzf "${path.join(CACHE, `${name}-${version}.tgz`)}" -C "${folder}"`);
  }
  return path.join(folder, "package", file);
}

// Answers the forecast services with made-up data and keeps everything else
// offline (map tiles, the Worker…). Used by this tool and tools/ux-check.js.
async function useFakeData(page) {
  await page.route("**/*", async route => {
    const url = route.request().url();
    if (url.startsWith("http://127.0.0.1")) return route.continue();
    const lats = () => (new URL(url).searchParams.get("latitude") || "50").split(",").map(Number);
    if (url.includes("api.open-meteo.com/v1/forecast")) {
      const data = lats().map(fakeForecast);
      return route.fulfill({ contentType: "application/json", body: JSON.stringify(data.length > 1 ? data : data[0]) });
    }
    if (url.includes("marine-api.open-meteo.com")) {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify(fakeMarine(lats()[0])) });
    }
    const library = url.match(/unpkg\.com\/(leaflet(?:-velocity|\.markercluster)?)@([\d.]+)\/(.*)$/);
    if (library) {
      try { return route.fulfill({ path: cachedLibrary(library[1], library[2], library[3]) }); } catch { return route.abort(); }
    }
    return route.abort();  // everything else (map tiles, the Worker…) stays offline
  });
}

module.exports = { serve, findPlaywright, useFakeData };

if (require.main === module) (async () => {
  const server = await serve();
  const { chromium } = findPlaywright();
  const browser = await chromium.launch(fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {});
  const page = await browser.newPage({ viewport: { width: opt.width, height: opt.height }, colorScheme: opt.dark ? "dark" : "light",
    hasTouch: opt.width < 600 });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));

  await useFakeData(page);
  await page.addInitScript(o => {
    if (localStorage.getItem("sc.preview")) return;  // only the first load
    localStorage.setItem("sc.preview", "1");
    localStorage.setItem("sc.sport", JSON.stringify(o.sport));
    localStorage.setItem("sc.view", JSON.stringify(o.view));
    localStorage.setItem("sc.layout", JSON.stringify(o.layout));
  }, opt);

  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await page.waitForTimeout(2000);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (opt.eval) console.log(JSON.stringify(await page.evaluate(opt.eval), null, 1));
  await page.screenshot({ path: opt.out });
  console.log(`Saved ${opt.out} (${opt.sport}, ${opt.view}, ${opt.width}px, ${opt.dark ? "dark" : "light"})` +
    (wide ? "\nPROBLEM: the page is wider than the screen" : "") +
    (errors.length ? "\nPAGE ERRORS:\n  " + errors.join("\n  ") : "\nNo page errors"));
  await browser.close();
  server.close();
})();
