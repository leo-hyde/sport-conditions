// Animated wind flow on our own map, like Windy's, drawn by the
// leaflet-velocity library (loaded in index.html). It needs the wind on a
// regular grid, so we ask Open-Meteo for an 8 × 8 grid of points covering the
// map, all 7 days, in one request. Moving through time then just picks a
// different hour from that data, without fetching again.

const FLOW_MIN_ZOOM = 8;  // further out than this, the flow is too coarse to look right
const FLOW_GRID = 8;  // 8 × 8 = 64 points: smooth enough, and gentle on the free service
let flowLayer = null;
let flowData = null;  // { model, bounds, times, points: [{ speed: [...], degrees: [...] }] }
let flowTimer = null;

// Called once the map exists (from setupMap in map.js).
function setupWindFlow() {
  if (typeof L.velocityLayer !== "function") return;  // the library didn't load
  map.on("moveend", () => {
    // If the flow we have doesn't cover the new view, hide it straight away
    // rather than leave a patch of particles while the new area loads.
    if (flowLayer && flowNeedsReload()) {
      flowLayer.remove();
      flowLayer = null;
    }
    clearTimeout(flowTimer);
    flowTimer = setTimeout(loadWindFlow, 700);
  });
  loadWindFlow();
}

// Only fetch again if the model changed, you've moved outside the area we
// have, or you've zoomed in so far that the grid would look coarse.
function flowNeedsReload() {
  if (!flowData || flowData.model !== state.model) return true;
  const view = map.getBounds();
  const have = flowData.bounds;
  const inside = view.getNorth() <= have.north && view.getSouth() >= have.south &&
                 view.getEast() <= have.east && view.getWest() >= have.west;
  const zoomedIn = view.getNorth() - view.getSouth() < (have.north - have.south) / 3;
  return !inside || zoomedIn;
}

async function loadWindFlow() {
  if (!map || typeof L.velocityLayer !== "function") return;
  if (!document.getElementById("show-flow").checked) return drawWindFlow();
  if (map.getZoom() < FLOW_MIN_ZOOM) {
    document.getElementById("flow-note").textContent = "Zoom in to see the wind flow.";
    return drawWindFlow();
  }
  document.getElementById("flow-note").textContent = "";
  if (!flowNeedsReload()) return drawWindFlow();
  if (forecastLimitReached) return drawWindFlow();

  // Half as big again as the screen on every side, so moving around a bit
  // doesn't need a new fetch.
  const view = map.getBounds().pad(0.5);
  const bounds = { north: view.getNorth(), south: view.getSouth(), east: view.getEast(), west: view.getWest() };
  // Points go row by row from north to south, west to east: the order
  // leaflet-velocity expects.
  const lats = [], lons = [];
  for (let row = 0; row < FLOW_GRID; row++) {
    for (let col = 0; col < FLOW_GRID; col++) {
      lats.push((bounds.north - row * (bounds.north - bounds.south) / (FLOW_GRID - 1)).toFixed(3));
      lons.push((bounds.west + col * (bounds.east - bounds.west) / (FLOW_GRID - 1)).toFixed(3));
    }
  }
  const model = state.model;
  const params = new URLSearchParams({
    latitude: lats.join(","),
    longitude: lons.join(","),
    hourly: "wind_speed_10m,wind_direction_10m",
    wind_speed_unit: "ms",  // the library works in metres per second
    timezone: "Europe/London",
    forecast_days: FORECAST_DAYS,
    models: model,
  });

  try {
    const data = await fetchJson("https://api.open-meteo.com/v1/forecast?" + params);
    const places = Array.isArray(data) ? data : [data];
    flowData = {
      model,
      bounds,
      times: places[0].hourly.time.map(time => time.slice(0, 13)),
      points: places.map(place => ({ speed: place.hourly.wind_speed_10m, degrees: place.hourly.wind_direction_10m })),
    };
    drawWindFlow();
  } catch {
    // Couldn't fetch: keep showing whatever we had.
  }
}

// leaflet-velocity wants the wind split into two grids: how fast it's going
// east (u) and how fast it's going north (v).
function drawWindFlow() {
  const wanted = document.getElementById("show-flow").checked && map.getZoom() >= FLOW_MIN_ZOOM;
  if (!wanted || !flowData || typeof L.velocityLayer !== "function") {
    if (flowLayer) flowLayer.remove();
    flowLayer = null;
    return;
  }
  const i = flowData.times.indexOf(state.mapTime);
  if (i === -1) return;

  const u = [], v = [];
  for (const point of flowData.points) {
    const speed = point.speed[i] ?? 0;
    const radians = (point.degrees[i] ?? 0) * Math.PI / 180;
    // Wind "from" the west blows towards the east, hence the minus signs.
    u.push(-speed * Math.sin(radians));
    v.push(-speed * Math.cos(radians));
  }

  const { north, south, east, west } = flowData.bounds;
  const header = {
    parameterCategory: 2,
    lo1: west, la1: north, lo2: east, la2: south,
    nx: FLOW_GRID, ny: FLOW_GRID,
    dx: (east - west) / (FLOW_GRID - 1),
    dy: (north - south) / (FLOW_GRID - 1),
    refTime: flowData.times[i] + ":00:00Z",
  };
  const grids = [
    { header: { ...header, parameterNumber: 2 }, data: u },
    { header: { ...header, parameterNumber: 3 }, data: v },
  ];

  if (flowLayer) {
    flowLayer.setData(grids);
  } else {
    flowLayer = L.velocityLayer({
      data: grids,
      displayValues: false,
      maxVelocity: 15,  // m/s; anything faster gets the last colour
      velocityScale: 0.008,
      lineWidth: 2,
      particleMultiplier: 1 / 400,
      opacity: 0.9,
      // Calm blue, through green and amber, to strong red.
      colorScale: ["#1e40af", "#2563eb", "#0891b2", "#059669", "#65a30d", "#ca8a04", "#ea580c", "#dc2626", "#9f1239"],
    }).addTo(map);
  }
}

document.getElementById("show-flow").addEventListener("change", loadWindFlow);
