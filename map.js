// The Map tab: your sites as coloured pins, every site in the site guide as
// small dots, an optional wind-arrow layer, and a time slider to move through
// the forecast (like Windy). Uses the Leaflet map library, loaded in index.html.

let map = null;
let pinLayer = null;
let libraryLayer = null;
let windLayer = null;
let windGrid = null;  // the latest wind-arrow forecast: { model, points }
let windTimer = null;

// The map is only created the first time the Map tab is opened, because
// Leaflet needs to be able to see how big its box is.
function setupMap() {
  if (map) return;
  if (typeof L === "undefined") {
    document.getElementById("map").innerHTML =
      '<p class="muted" style="padding: 16px">The map couldn\'t load. Check your connection.</p>';
    return;
  }
  // "preferCanvas" draws the ~1,000 site dots quickly.
  map = L.map("map", { preferCanvas: true });
  // OpenTopoMap shows hills and contour lines: useful for flying.
  // (In dark mode, style.css dims it.)
  L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, SRTM · Style &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
  }).addTo(map);
  windLayer = L.layerGroup().addTo(map);
  libraryLayer = L.layerGroup().addTo(map);
  pinLayer = L.layerGroup().addTo(map);

  if (state.sites.length > 0) {
    map.fitBounds(state.sites.map(site => [site.lat, site.lon]), { padding: [40, 40], maxZoom: 11 });
  } else {
    map.setView([50.4, -5.1], 9);
  }
  map.on("moveend", () => {
    // Wait until the map stops moving before fetching new wind arrows.
    clearTimeout(windTimer);
    windTimer = setTimeout(loadWindGrid, 600);
  });
  drawLibrary();
  loadWindGrid();
}

// Every hour shown anywhere, in order, e.g. ["2026-10-21T08", …].
function mapHourKeys() {
  const keys = new Set();
  for (const site of state.sites) {
    for (const hours of Object.values(siteDays(site))) {
      hours.forEach(hour => keys.add(hour.key));
    }
  }
  return [...keys].sort();
}

function renderMap() {
  if (state.view !== "map") return;
  setupMap();
  if (!map) return;
  map.invalidateSize();  // the map's box may have changed size while hidden
  drawLibrary();
  if (windGrid && windGrid.model !== state.model) loadWindGrid();
  drawTime();
}

// Redraws just the parts that change with the time: quicker than renderMap.
function drawTime() {
  const keys = mapHourKeys();
  if (keys.length === 0) return;
  // Start at the next hour to come (or the first hour, if the day is over).
  if (!keys.includes(state.mapTime)) {
    state.mapTime = keys.find(key => key >= londonNowKey()) || keys[0];
  }

  const slider = document.getElementById("map-slider");
  slider.max = keys.length - 1;
  slider.value = keys.indexOf(state.mapTime);

  const dates = [...new Set(keys.map(key => key.slice(0, 10)))];
  document.getElementById("map-days").innerHTML = dates.map(date =>
    `<button data-map-day="${date}" class="${state.mapTime.startsWith(date) ? "active" : ""}">${dayLabel(date)}</button>`
  ).join("");

  drawPins();
  drawWind();
}

function drawPins() {
  document.getElementById("map-time").textContent =
    `${dayLabel(state.mapTime.slice(0, 10))} · ${state.mapTime.slice(11)}:00`;

  pinLayer.clearLayers();
  for (const site of state.sites) {
    const hour = (state.forecasts[site.id] || []).find(hour => hour.key === state.mapTime);
    const html = hour
      ? `<div class="map-pin ${rateHour(hour, site, state.settings, state.tides[site.id])}">${arrow(hour.degrees)}<span>${hour.speed}</span></div>`
      : '<div class="map-pin night">–</div>';

    L.marker([site.lat, site.lon], {
      icon: L.divIcon({ html, className: "", iconSize: [44, 44], iconAnchor: [22, 22] }),
      title: site.name,
      zIndexOffset: 1000,
    })
      .bindTooltip(esc(site.name), { permanent: true, direction: "bottom", offset: [0, 20], className: "pin-label" })
      .on("click", () => { if (hour) showHourDetails(site.id, hour.key); })
      .addTo(pinLayer);
  }
}

// ---------- The site guide: every other site as a small dot ----------

function drawLibrary() {
  libraryLayer.clearLayers();
  if (!document.getElementById("show-library").checked) return;

  const mine = new Set(state.sites.map(site => site.name.toLowerCase().replace(/\s/g, "")));
  SITE_LIBRARY.forEach((site, index) => {
    if (site.closed || mine.has(site.name.toLowerCase().replace(/\s/g, ""))) return;
    L.circleMarker([site.lat, site.lon], {
      radius: 6, weight: 2, color: "#ffffff", fillColor: "#64748b", fillOpacity: 0.9,
    })
      .bindPopup(() => librarySitePopup(site, index))
      .addTo(libraryLayer);
  });
}

function librarySitePopup(site, index) {
  return `<div class="lib-popup">
    ${compassSvg(directionRatings(site), { size: 64 })}
    <div>
      <strong>${esc(site.name)}</strong>
      <p class="muted">Good: ${site.goodDirections.join(" ") || "–"}<br>OK: ${site.okDirections.join(" ") || "–"}</p>
      <button class="btn small primary" data-add-library="${index}">+ Add to my sites</button>
    </div>
  </div>`;
}

document.addEventListener("click", async event => {
  const button = event.target.closest("[data-add-library]");
  if (!button) return;
  const site = librarySiteCopy(SITE_LIBRARY[button.dataset.addLibrary]);
  state.sites.push(site);
  saveSites(state.sites);
  map.closePopup();
  await loadSite(site);
  render();
});

document.getElementById("show-library").addEventListener("change", drawLibrary);

// ---------- Wind arrows across the map ----------

// Fetches the wind at a 7 × 7 grid of points covering the map, all in one
// request, for the chosen model.
async function loadWindGrid() {
  if (!map || !document.getElementById("show-wind").checked) return;
  const bounds = map.getBounds();
  const lats = [], lons = [];
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 7; col++) {
      lats.push((bounds.getSouth() + (row + 0.5) * (bounds.getNorth() - bounds.getSouth()) / 7).toFixed(3));
      lons.push((bounds.getWest() + (col + 0.5) * (bounds.getEast() - bounds.getWest()) / 7).toFixed(3));
    }
  }
  const params = new URLSearchParams({
    latitude: lats.join(","),
    longitude: lons.join(","),
    hourly: "wind_speed_10m,wind_direction_10m",
    wind_speed_unit: "mph",
    timezone: "Europe/London",
    forecast_days: FORECAST_DAYS,
    models: state.model,
  });
  try {
    const data = await fetchJson("https://api.open-meteo.com/v1/forecast?" + params);
    const points = (Array.isArray(data) ? data : [data]).map((point, i) => ({
      lat: Number(lats[i]),
      lon: Number(lons[i]),
      hourly: point.hourly,
    }));
    windGrid = { model: state.model, points };
    drawWind();
  } catch {
    windGrid = null;
  }
}

// Arrow colour by speed, from calm blue to stormy red.
function windColour(speed) {
  if (speed < 8) return "#60a5fa";
  if (speed < 14) return "#34d399";
  if (speed < 20) return "#facc15";
  if (speed < 28) return "#fb923c";
  return "#ef4444";
}

function drawWind() {
  windLayer.clearLayers();
  if (!windGrid || !document.getElementById("show-wind").checked) return;
  for (const point of windGrid.points) {
    const i = point.hourly.time.findIndex(time => time.startsWith(state.mapTime));
    const speed = point.hourly.wind_speed_10m[i];
    const degrees = point.hourly.wind_direction_10m[i];
    if (speed === null || speed === undefined) continue;
    L.marker([point.lat, point.lon], {
      icon: L.divIcon({
        className: "",
        html: `<div class="wind-arrow" style="color: ${windColour(speed)}">${arrow(degrees)}<span>${Math.round(speed)}</span></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      }),
      interactive: false,
      zIndexOffset: -1000,
    }).addTo(windLayer);
  }
}

document.getElementById("show-wind").addEventListener("change", () => {
  if (document.getElementById("show-wind").checked && !windGrid) loadWindGrid();
  drawWind();
});

// ---------- Moving through time ----------

// Dragging the slider moves through the hours.
document.getElementById("map-slider").addEventListener("input", event => {
  state.mapTime = mapHourKeys()[event.target.value];
  drawTime();
});

// The day buttons jump to that day (the next hour to come, if it's today).
document.getElementById("map-days").addEventListener("click", event => {
  const button = event.target.closest("[data-map-day]");
  if (!button) return;
  const dayKeys = mapHourKeys().filter(key => key.startsWith(button.dataset.mapDay));
  state.mapTime = dayKeys.find(key => key >= londonNowKey()) || dayKeys[0];
  drawTime();
});
