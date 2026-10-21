// The Map tab: sites as coloured pins, with a time slider to move through
// the forecast (like Windy). Uses the Leaflet map library, loaded in index.html.

let map = null;
let pinLayer = null;

// The map is only created the first time the Map tab is opened, because
// Leaflet needs to be able to see how big its box is.
function setupMap() {
  if (map) return;
  if (typeof L === "undefined") {
    document.getElementById("map").innerHTML =
      '<p class="muted" style="padding: 16px">The map couldn\'t load. Check your connection.</p>';
    return;
  }
  map = L.map("map");
  // OpenTopoMap shows hills and contour lines: useful for flying.
  // (In dark mode, style.css dims it.)
  L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, SRTM · Style &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
  }).addTo(map);
  pinLayer = L.layerGroup().addTo(map);

  if (state.sites.length > 0) {
    map.fitBounds(state.sites.map(site => [site.lat, site.lon]), { padding: [40, 40], maxZoom: 11 });
  } else {
    map.setView([50.4, -5.1], 9);
  }
}

// Every daylight hour in the forecast, in order, e.g. ["2026-10-21T08", …].
function mapHourKeys() {
  const keys = new Set();
  for (const site of state.sites) {
    for (const hour of state.forecasts[site.id] || []) {
      if (hour.isDaylight) keys.add(hour.key);
    }
  }
  return [...keys].sort();
}

function renderMap() {
  if (state.view !== "map") return;
  setupMap();
  if (!map) return;
  map.invalidateSize();  // the map's box may have changed size while hidden

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
      ? `<div class="map-pin ${rateHour(hour, site, state.settings)}">${arrow(hour.degrees)}<span>${hour.speed}</span></div>`
      : '<div class="map-pin night">–</div>';

    L.marker([site.lat, site.lon], {
      icon: L.divIcon({ html, className: "", iconSize: [44, 44], iconAnchor: [22, 22] }),
      title: site.name,
    })
      .bindTooltip(esc(site.name), { permanent: true, direction: "bottom", offset: [0, 20], className: "pin-label" })
      .on("click", () => { if (hour) showHourDetails(site.id, hour.key); })
      .addTo(pinLayer);
  }
}

// Dragging the slider moves through the hours.
document.getElementById("map-slider").addEventListener("input", event => {
  state.mapTime = mapHourKeys()[event.target.value];
  renderMap();
});

// The day buttons jump to that day (the next hour to come, if it's today).
document.getElementById("map-days").addEventListener("click", event => {
  const button = event.target.closest("[data-map-day]");
  if (!button) return;
  const dayKeys = mapHourKeys().filter(key => key.startsWith(button.dataset.mapDay));
  state.mapTime = dayKeys.find(key => key >= londonNowKey()) || dayKeys[0];
  renderMap();
});
