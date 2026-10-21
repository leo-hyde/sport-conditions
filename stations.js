// Live wind from airport weather reports (METARs), shown on the map.
// aviationweather.gov doesn't let web pages fetch its data directly, so we
// go through our own Cloudflare Worker (see worker/weather-proxy.js).
// These are what's happening *now*; the map's time slider doesn't change them.

const STATIONS_URL = "https://sport-conditions-weather.leo-h-hyde.workers.dev/metar";
const KNOTS_TO_MPH = 1.15078;

let stationLayer = null;
let stationTimer = null;
const stationNames = {};  // airport code → tidy name, e.g. EGHQ → "Newquay/Cornwall Arpt"


// Called once the map exists (from setupMap in map.js).
function setupStations() {
  stationLayer = L.layerGroup().addTo(map);
  // Fetch again when the map stops moving (after a short pause)…
  map.on("moveend", () => {
    clearTimeout(stationTimer);
    stationTimer = setTimeout(loadStations, 800);
  });
  // …and every 10 minutes, as airports report about every 30 minutes.
  setInterval(loadStations, 10 * 60 * 1000);
  loadStations();
}

async function loadStations() {
  if (!stationLayer || !document.getElementById("show-stations").checked) return;
  const box = map.getBounds().pad(0.2);  // a little beyond the edges
  const bbox = [box.getSouth(), box.getWest(), box.getNorth(), box.getEast()]
    .map(n => n.toFixed(2)).join(",");
  try {
    const reports = await fetchJson(`${STATIONS_URL}?bbox=${bbox}`);
    drawStations(Array.isArray(reports) ? reports : []);
  } catch {
    stationLayer.clearLayers();  // the Worker isn't working; show nothing
  }
}

function drawStations(reports) {
  stationLayer.clearLayers();
  if (!document.getElementById("show-stations").checked) return;

  for (const report of reports) {
    // Names come like "Newquay/Cornwall Arpt, EN, GB"; keep the first part.
    stationNames[report.icaoId] = (report.name || report.icaoId).split(",")[0].replace(/[()]/g, "").trim();
    const speed = Math.round(report.wspd * KNOTS_TO_MPH);
    const gust = report.wgst ? Math.round(report.wgst * KNOTS_TO_MPH) : null;
    const variable = report.wdir === "VRB" || typeof report.wdir !== "number";
    const minutesAgo = Math.round((Date.now() / 1000 - report.obsTime) / 60);
    const observed = new Date(report.obsTime * 1000)
      .toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });

    const html = `<div class="station-pin">
      <span class="live-dot"></span>
      ${variable ? "VRB" : arrow(report.wdir)}
      <strong>${speed}${gust ? `<small>g${gust}</small>` : ""}</strong>
    </div>`;
    const details = `<strong>${esc(stationNames[report.icaoId])}</strong><br>
      Live: ${variable ? "variable" : `from ${degreesToCompass(report.wdir)}`} ${speed} mph${gust ? `, gusting ${gust}` : ""}<br>
      <span class="muted">Observed ${observed} (${minutesAgo} min ago)</span><br>
      <code>${esc(report.rawOb || "")}</code><br>
      <button class="btn small primary" data-station-history="${report.icaoId}">📈 Last 24 hours</button>`;

    L.marker([report.lat, report.lon], {
      icon: L.divIcon({ html, className: "", iconSize: [64, 28], iconAnchor: [32, 14] }),
      zIndexOffset: 500,
    })
      .bindPopup(details)
      .addTo(stationLayer);
  }
}

document.getElementById("show-stations").addEventListener("change", () => {
  if (document.getElementById("show-stations").checked) loadStations();
  else stationLayer.clearLayers();
});
