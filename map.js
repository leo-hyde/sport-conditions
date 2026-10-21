// The Map tab: your sites as big coloured pins (with a gold star), sites from
// the site guide as small dots (rated too, once you zoom in), and a time slider
// to move through the forecast. You can drop a pin to add a new site. Uses the
// Leaflet map library, loaded in index.html. It can also switch to Windy's
// animated wind map, which Windy lets anyone embed for free.

let map = null;
let pinLayer = null;
let libraryLayer = null;  // grey dots: guide sites without a forecast yet
let ratedLibraryLayer = null;  // guide sites with a forecast, coloured by rating
let libraryTimer = null;
let placingPin = false;  // true after tapping "Add site on map"

// Forecasts for guide sites near where you're looking: model → { site index → hours }.
const libraryForecasts = {};
// Only fetch guide-site forecasts when this many or fewer are on screen,
// so we don't ask the weather service for hundreds at once.
const MAX_RATED_GUIDE_SITES = 40;

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
  ratedLibraryLayer = L.layerGroup().addTo(map);
  pinLayer = L.layerGroup().addTo(map);

  if (state.sites.length > 0) {
    map.fitBounds(state.sites.map(site => [site.lat, site.lon]), { padding: [40, 40], maxZoom: 11 });
  } else {
    map.setView([50.4, -5.1], 9);
  }
  drawLibrary();
  setupStations();

  // When the map stops moving, fetch forecasts for the guide sites in view.
  map.on("moveend", () => {
    clearTimeout(libraryTimer);
    libraryTimer = setTimeout(loadLibraryForecasts, 600);
  });
  loadLibraryForecasts();

  // Tapping the map while placing a pin, or a long press / right-click at any
  // time, starts adding a site there.
  map.on("click", event => {
    if (!placingPin) return;
    stopPlacingPin();
    addSiteAt(event.latlng);
  });
  map.on("contextmenu", event => {
    L.popup()
      .setLatLng(event.latlng)
      .setContent(`<button class="btn small primary" data-add-here="${event.latlng.lat},${event.latlng.lng}">📍 Add a site here</button>`)
      .openOn(map);
  });
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
  loadLibraryForecasts();  // e.g. after switching model
}

// Redraws just the parts that change with the time: quicker than renderMap.
function drawTime() {
  const keys = mapHourKeys();
  if (keys.length === 0) return;
  // Start at the next hour to come (or the first hour, if the day is over).
  if (!keys.includes(state.mapTime)) {
    state.mapTime = keys.find(key => key >= londonNowKey()) || keys[0];
  }

  drawTimeline(keys);
  drawPins();
  drawRatedLibrary();
}

// ---------- The timeline (like Windy's) ----------

// The best rating at any of your sites, for each hour: { key → "good" | "ok" | "no" }.
// It colours the timeline, so you can see the good times before you drag there.
function bestRatings() {
  const best = {};
  const order = { no: 0, ok: 1, good: 2 };
  for (const site of state.sites) {
    for (const hours of Object.values(siteDays(site))) {
      for (const hour of hours) {
        if (!best[hour.key] || order[hour.rating] > order[best[hour.key]]) best[hour.key] = hour.rating;
      }
    }
  }
  return best;
}

// Days side by side, each with its label, a coloured bar per hour and some
// hour numbers. A bubble above shows the chosen day and time.
function drawTimeline(keys) {
  const best = bestRatings();
  const dates = [...new Set(keys.map(key => key.slice(0, 10)))];
  const now = londonNowKey();

  document.getElementById("map-track").innerHTML = dates.map(date => {
    const dayKeys = keys.filter(key => key.startsWith(date));
    const bars = dayKeys.map(key =>
      `<div class="tl-bar ${best[key] || "no"} ${key < now ? "past" : ""} ${key === state.mapTime ? "active" : ""}" data-map-key="${key}"></div>`
    ).join("");
    const hourLabels = dayKeys.map(key => {
      const hour = Number(key.slice(11));
      return `<span class="${hour % 6 === 0 ? "" : "minor"}">${hour % 3 === 0 ? hour : ""}</span>`;
    }).join("");
    return `<div class="tl-day ${state.mapTime.startsWith(date) ? "current" : ""}" style="flex-grow: ${dayKeys.length}">
      <button class="tl-label" data-map-day="${date}">${dayLabel(date)}</button>
      <div class="tl-bars">${bars}</div>
      <div class="tl-hours">${hourLabels}</div>
    </div>`;
  }).join("");

  // Put the bubble above the chosen hour's bar.
  const active = document.querySelector(".tl-bar.active");
  const bubble = document.getElementById("map-bubble");
  const wrap = document.getElementById("map-track-wrap").getBoundingClientRect();
  const bar = active.getBoundingClientRect();
  const centre = bar.left + bar.width / 2 - wrap.left;
  bubble.textContent = `${dayLabel(state.mapTime.slice(0, 10))} ${state.mapTime.slice(11)}:00`;
  // Keep the bubble inside the box at the far left and right.
  const half = bubble.offsetWidth / 2;
  bubble.style.left = `${Math.min(Math.max(centre, half), wrap.width - half)}px`;
}

function setMapTime(key) {
  if (!key || key === state.mapTime) return;
  state.mapTime = key;
  drawTime();
}

// Moves the time by a number of hours (−1 = back an hour).
function stepMapTime(steps) {
  const keys = mapHourKeys();
  const index = keys.indexOf(state.mapTime) + steps;
  setMapTime(keys[Math.min(Math.max(index, 0), keys.length - 1)]);
}

function drawPins() {
  const date = state.mapTime.slice(0, 10);
  const sun = state.sites[0] ? flyingWindow(state.sites[0], date, state.settings) : null;
  document.getElementById("map-time").innerHTML =
    `${dayLabel(date)} · ${state.mapTime.slice(11)}:00` +
    (sun ? `<small>☀ ${formatHours(sun.sunrise)}–${formatHours(sun.sunset)} · ${tideRange(date)} tides</small>` : "");

  pinLayer.clearLayers();
  for (const site of state.sites) {
    const hour = (state.forecasts[site.id] || []).find(hour => hour.key === state.mapTime);
    // Your sites are big pins with a gold ring and star, so they stand out.
    const html = hour
      ? `<div class="map-pin mine ${rateHour(hour, site, state.settings, state.tides[site.id])}">${arrow(hour.degrees)}<span>${hour.speed}</span><small>${unit().label}</small><i class="pin-star">★</i></div>`
      : '<div class="map-pin mine night">–<i class="pin-star">★</i></div>';

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

// ---------- The site guide: every other site ----------

// Guide sites that aren't already yours and aren't closed, with their place
// in SITE_LIBRARY (the "index").
function guideSites() {
  const simple = name => name.toLowerCase().replace(/\s/g, "");
  const mine = new Set(state.sites.map(site => simple(site.name)));
  return SITE_LIBRARY
    .map((site, index) => ({ site, index }))
    .filter(({ site }) => !site.closed && !mine.has(simple(site.name)));
}

function guideForecast(index) {
  return (libraryForecasts[state.model] || {})[index];
}

// Grey dots for guide sites we don't have a forecast for (yet).
function drawLibrary() {
  libraryLayer.clearLayers();
  if (!document.getElementById("show-library").checked) return;
  for (const { site, index } of guideSites()) {
    if (guideForecast(index)) continue;  // drawn by drawRatedLibrary instead
    L.circleMarker([site.lat, site.lon], {
      radius: 6, weight: 2, color: "#ffffff", fillColor: "#64748b", fillOpacity: 0.9,
    })
      .bindPopup(() => librarySitePopup(site, index))
      .addTo(libraryLayer);
  }
}

// Small coloured pins (rating and wind speed at the map's time) for guide
// sites we have a forecast for. Redrawn as you move through time.
function drawRatedLibrary() {
  if (!ratedLibraryLayer) return;
  ratedLibraryLayer.clearLayers();
  if (!document.getElementById("show-library").checked) return;
  for (const { site, index } of guideSites()) {
    const hour = (guideForecast(index) || []).find(hour => hour.key === state.mapTime);
    if (!hour) continue;
    const rating = rateHour(hour, site, state.settings);
    L.marker([site.lat, site.lon], {
      icon: L.divIcon({
        className: "",
        html: `<div class="lib-pin ${rating}">${arrow(hour.degrees)}${hour.speed}</div>`,
        iconSize: [40, 22],
        iconAnchor: [20, 11],
      }),
      title: site.name,
    })
      .bindPopup(() => librarySitePopup(site, index))
      .addTo(ratedLibraryLayer);
  }
}

// Fetches forecasts for the guide sites on screen (if there aren't too many),
// all in one request, then redraws them.
async function loadLibraryForecasts() {
  const note = document.getElementById("library-note");
  if (!map || !document.getElementById("show-library").checked) {
    note.textContent = "";
    return;
  }
  const bounds = map.getBounds();
  const visible = guideSites().filter(({ site }) => bounds.contains([site.lat, site.lon]));
  if (visible.length > MAX_RATED_GUIDE_SITES) {
    note.textContent = `Zoom in to see forecasts for the ${visible.length} guide sites in view.`;
    return;
  }
  note.textContent = "";
  const model = state.model;
  if (!libraryForecasts[model]) libraryForecasts[model] = {};
  const missing = visible.filter(({ index }) => !libraryForecasts[model][index]);
  if (missing.length === 0) return;

  try {
    const results = await fetchForecasts(missing.map(({ site }) => site), model);
    missing.forEach(({ index }, i) => { libraryForecasts[model][index] = results[i]; });
  } catch {
    note.textContent = "Couldn't load forecasts for the guide sites.";
    return;
  }
  drawLibrary();
  drawRatedLibrary();
}

// The popup for a guide site: its directions and (if we have a forecast) how
// it looks at the map's time, with a button to add it to your sites.
function librarySitePopup(site, index) {
  const hour = (guideForecast(index) || []).find(hour => hour.key === state.mapTime);
  let forecast = "";
  if (hour) {
    const checks = checkHour(hour, site, state.settings);
    const rating = worstRating(checks.map(check => check.rating));
    forecast = `<p class="popup-forecast">
        <span class="badge ${rating}">${RATING_TEXT[rating]}</span>
        ${dayLabel(hour.date)} ${hour.hourOfDay}:00 · ${arrow(hour.degrees)} ${hour.direction}
        ${hour.speed} ${unit().label}, gusts ${hour.gusts}
      </p>
      <ul class="checks small">${checks.map(check =>
        `<li class="${check.rating}"><span class="check-icon">${CHECK_ICONS[check.rating]}</span>${check.text}</li>`).join("")}</ul>`;
  }
  return `<div class="lib-popup">
    ${compassSvg(directionRatings(site), { size: 64 })}
    <div>
      <strong>${esc(site.name)}</strong>
      <p class="muted">Good: ${site.goodDirections.join(" ") || "–"}<br>OK: ${site.okDirections.join(" ") || "–"}</p>
      ${forecast}
      <button class="btn small primary" data-add-library="${index}">☆ Add to my sites</button>
    </div>
  </div>`;
}

// ---------- Dropping a pin to add a new site ----------

function startPlacingPin() {
  placingPin = true;
  document.getElementById("map").classList.add("placing");
  showToast("Tap the map where your site is", "Cancel", stopPlacingPin);
}

function stopPlacingPin() {
  placingPin = false;
  document.getElementById("map").classList.remove("placing");
  document.getElementById("toast").hidden = true;
}

function addSiteAt(latlng) {
  map.closePopup();
  openSiteForm(null, { lat: latlng.lat, lon: latlng.lng });
}

document.getElementById("drop-pin").addEventListener("click", () => {
  if (placingPin) stopPlacingPin();
  else startPlacingPin();
});

document.addEventListener("click", event => {
  const button = event.target.closest("[data-add-here]");
  if (!button) return;
  const [lat, lng] = button.dataset.addHere.split(",").map(Number);
  addSiteAt({ lat, lng });
});

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

document.getElementById("show-library").addEventListener("change", () => {
  drawLibrary();
  drawRatedLibrary();
  loadLibraryForecasts();
});

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
    metricWind: unit().windy,
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

// Pressing and dragging along the bars moves through the hours. "Pointer"
// events work for both a mouse and a finger.
const track = document.getElementById("map-track");

function timeAtPointer(event) {
  const bars = [...track.querySelectorAll(".tl-bar")];
  // The bar under the finger, or the nearest one if it's between bars.
  let nearest = bars[0];
  for (const bar of bars) {
    const box = bar.getBoundingClientRect();
    if (Math.abs(box.left + box.width / 2 - event.clientX) <
        Math.abs(nearest.getBoundingClientRect().left + nearest.getBoundingClientRect().width / 2 - event.clientX)) {
      nearest = bar;
    }
  }
  return nearest.dataset.mapKey;
}

track.addEventListener("pointerdown", event => {
  // Day labels jump to that day (the next hour to come, if it's today).
  const label = event.target.closest("[data-map-day]");
  if (label) {
    const dayKeys = mapHourKeys().filter(key => key.startsWith(label.dataset.mapDay));
    setMapTime(dayKeys.find(key => key >= londonNowKey()) || dayKeys[0]);
    return;
  }
  track.setPointerCapture(event.pointerId);
  setMapTime(timeAtPointer(event));
});

track.addEventListener("pointermove", event => {
  if (track.hasPointerCapture(event.pointerId)) setMapTime(timeAtPointer(event));
});

document.getElementById("map-prev").addEventListener("click", () => stepMapTime(-1));
document.getElementById("map-next").addEventListener("click", () => stepMapTime(1));

// The left and right arrow keys step through the hours too.
track.addEventListener("keydown", event => {
  if (event.key === "ArrowLeft") stepMapTime(-1);
  if (event.key === "ArrowRight") stepMapTime(1);
});
