// The Map tab: your sites as coloured pins, every site in the site guide as
// small dots, and a time slider to move through the forecast. Uses the
// Leaflet map library, loaded in index.html. It can also switch to Windy's
// animated wind map, which Windy lets anyone embed for free.

let map = null;
let pinLayer = null;
let libraryLayer = null;

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
  libraryLayer = L.layerGroup().addTo(map);
  pinLayer = L.layerGroup().addTo(map);

  if (state.sites.length > 0) {
    map.fitBounds(state.sites.map(site => [site.lat, site.lon]), { padding: [40, 40], maxZoom: 11 });
  } else {
    map.setView([50.4, -5.1], 9);
  }
  drawLibrary();
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
  if (!document.getElementById("windy-box").hidden) {
    showMapMode("windy");  // keeps Windy in step with the chosen model
    return;
  }
  setupMap();
  if (!map) return;
  map.invalidateSize();  // the map's box may have changed size while hidden
  drawLibrary();
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

// ---------- Windy's animated wind map ----------

// Windy's model names for ours, so the animation matches the chosen model.
const WINDY_PRODUCTS = {
  ukmo_seamless: "ukv",
  ecmwf_ifs025: "ecmwf",
  icon_seamless: "iconEu",
  gfs_seamless: "gfs",
  meteofrance_seamless: "arome",
};

function windyEmbedUrl() {
  // Centre it on the middle of your sites (or Cornwall if there are none).
  const lats = state.sites.map(site => site.lat);
  const lons = state.sites.map(site => site.lon);
  const middle = values => values.length ? (Math.min(...values) + Math.max(...values)) / 2 : null;
  const params = new URLSearchParams({
    lat: (middle(lats) ?? 50.4).toFixed(3),
    lon: (middle(lons) ?? -5.1).toFixed(3),
    zoom: 9,
    level: "surface",
    overlay: "wind",
    product: WINDY_PRODUCTS[state.model],
    marker: "true",
    calendar: "now",
    type: "map",
    location: "coordinates",
    metricWind: "mph",
    metricTemp: "°C",
  });
  return "https://embed.windy.com/embed2.html?" + params;
}

// Switches between your sites map and Windy's animation.
function showMapMode(mode) {
  const windy = mode === "windy";
  document.querySelectorAll("#map-mode button").forEach(button => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });
  document.getElementById("map").hidden = windy;
  document.getElementById("map-timeline").hidden = windy;
  document.getElementById("windy-box").hidden = !windy;
  if (windy) {
    // Only reload Windy if the model or sites have changed.
    const frame = document.getElementById("windy-frame");
    const url = windyEmbedUrl();
    if (frame.src !== url) frame.src = url;
  } else {
    renderMap();
  }
}

document.getElementById("map-mode").addEventListener("click", event => {
  const button = event.target.closest("[data-mode]");
  if (button) showMapMode(button.dataset.mode);
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
