// The Map tab: your sites as big coloured pins (with a gold star), sites from
// the site guide as small dots (rated too, once you zoom in), and a time slider
// to move through the forecast. You can drop a pin to add a new site. Uses the
// Leaflet map library, loaded in index.html.

let map = null;
let pinLayer = null;
let libraryLayer = null;  // grey dots: guide sites without a forecast yet
let ratedLibraryLayer = null;  // guide sites with a forecast, coloured by rating
let libraryTimer = null;
let placingPin = false;  // true after tapping "Add site on map"
let youLayer = null;  // the blue "you are here" dot and its accuracy circle

// Forecasts for guide sites near where you're looking: model → { site index → hours }.
const libraryForecasts = {};
// Only fetch guide-site forecasts when this many or fewer are on screen,
// so we don't ask the weather service for hundreds at once. They're fetched
// in batches of 40 places per request.
const MAX_RATED_GUIDE_SITES = 60;
const GUIDE_MIN_ZOOM = 9;  // only fetch guide-site forecasts once zoomed in this far
const GUIDE_BATCH = 40;

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

  fitMapToSites();
  addMapKey();
  addLocateButton();
  drawLibrary();
  setupStations();
  setupWindFlow();

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

// Shows all your sites for the current sport (or Cornwall, if there are none).
function fitMapToSites() {
  if (!map) return;
  const sites = sportSites();
  if (sites.length > 0) {
    map.fitBounds(sites.map(site => [site.lat, site.lon]), { padding: [40, 40], maxZoom: 12 });
  } else {
    map.setView([50.4, -5.1], 9);
  }
}

// A small key in the corner explaining the different markers. It starts
// closed on phones, where space is tight.
function addMapKey() {
  const key = L.control({ position: "bottomleft" });
  key.onAdd = () => {
    const box = L.DomUtil.create("details", "map-key");
    box.open = window.innerWidth > 600;
    box.innerHTML = `<summary>Key</summary>
      <div class="key-row"><span class="key-mine">★</span>Your sites</div>
      <div class="key-row"><span class="key-guide"></span>Other sites (tap to add; grey until you zoom in)</div>
      <div class="key-row"><span class="key-live">LIVE</span>Airport wind right now</div>
      <div class="key-row key-ratings"><i class="good"></i>Good <i class="ok"></i>OK <i class="no"></i>No</div>
      <div class="key-row muted">Coloured streaks: forecast wind flow</div>`;
    L.DomEvent.disableClickPropagation(box);  // tapping the key doesn't tap the map
    return box;
  };
  key.addTo(map);
}

// A ◎ button under the zoom buttons: shows where you are. The phone asks
// for permission the first time. Your location stays on the device: it is
// only used to move the map, never sent anywhere.
function addLocateButton() {
  const control = L.control({ position: "topleft" });
  control.onAdd = () => {
    const bar = L.DomUtil.create("div", "leaflet-bar locate-control");
    bar.innerHTML = '<a href="#" role="button" class="locate-btn" title="Show where I am" aria-label="Show where I am">◎</a>';
    L.DomEvent.disableClickPropagation(bar);
    bar.querySelector("a").addEventListener("click", event => {
      event.preventDefault();
      showWhereIAm();
    });
    return bar;
  };
  control.addTo(map);
  youLayer = L.layerGroup().addTo(map);
  map.on("locationfound", event => {
    document.querySelector(".locate-btn").classList.remove("busy");
    youLayer.clearLayers();
    // Colours are set here, not in style.css: this map draws on a canvas.
    L.circle(event.latlng, { radius: event.accuracy, interactive: false,
      color: "#2563eb", opacity: 0.4, weight: 1, fillColor: "#2563eb", fillOpacity: 0.12 }).addTo(youLayer);
    L.circleMarker(event.latlng, { radius: 7, interactive: false,
      color: "#ffffff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }).addTo(youLayer);
  });
  map.on("locationerror", event => {
    document.querySelector(".locate-btn").classList.remove("busy");
    showToast(event.code === 1
      ? "Location blocked: allow it for this site in the browser settings"
      : "Couldn't find where you are. Try again outside, or with location on");
  });
}

function showWhereIAm() {
  document.querySelector(".locate-btn").classList.add("busy");
  map.locate({ setView: true, maxZoom: 12, timeout: 15000, enableHighAccuracy: true });
}

// Every hour shown anywhere, in order, e.g. ["2026-10-21T08", …].
function mapHourKeys() {
  const keys = new Set();
  for (const site of sportSites()) {
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
  drawTime();
  loadLibraryForecasts();  // e.g. after switching model
  loadWindFlow();
}

// Redraws just the parts that change with the time: quicker than renderMap.
function drawTime() {
  const keys = mapHourKeys();
  if (keys.length === 0) {
    // No forecasts at all: still show where your sites are.
    state.mapTime = londonNowKey();
    document.getElementById("map-track").innerHTML = '<p class="hint">No forecast to scroll through yet.</p>';
    timelineDrawn = "";
    drawPins();
    return;
  }
  // Start at the next hour to come (or the first hour, if the day is over).
  if (!keys.includes(state.mapTime)) {
    state.mapTime = keys.find(key => key >= londonNowKey()) || keys[0];
  }

  drawTimeline(keys);
  drawPins();
  drawRatedLibrary();
  drawWindFlow();
}

// ---------- The timeline (like Windy's) ----------

// The best rating at any of your sites, for each hour: { key → "good" | "ok" | "no" }.
// It colours the timeline, so you can see the good times before you drag there.
function bestRatings() {
  const best = {};
  const order = { no: 0, ok: 1, good: 2 };
  for (const site of sportSites()) {
    for (const hours of Object.values(siteDays(site))) {
      for (const hour of hours) {
        if (!best[hour.key] || order[hour.rating] > order[best[hour.key]]) best[hour.key] = hour.rating;
      }
    }
  }
  return best;
}

// On phones the timeline is a strip you swipe sideways, under a marker
// fixed in the middle; the hour under the marker is the chosen time. On
// bigger screens all 7 days fit, and you drag along them.
const phoneTimeline = () => matchMedia("(max-width: 600px)").matches;
let timelineDrawn = "";  // what the bars were last drawn from, to skip redrawing them
let scrollingTimeline = false;  // true while the strip is being swiped

// Days side by side, each with its label, a coloured bar per hour and some
// hour numbers. A bubble above shows the chosen day and time.
function drawTimeline(keys) {
  const best = bestRatings();
  const dates = [...new Set(keys.map(key => key.slice(0, 10)))];
  const now = londonNowKey();

  // Redraw the bars only when they've changed (not on every move of the time).
  const drawnFrom = JSON.stringify([keys, best, now, phoneTimeline()]);
  if (drawnFrom !== timelineDrawn) {
    timelineDrawn = drawnFrom;
    track.innerHTML = dates.map(date => {
      const dayKeys = keys.filter(key => key.startsWith(date));
      const bars = dayKeys.map(key =>
        `<div class="tl-bar ${best[key] || "no"} ${key < now ? "past" : ""}" data-map-key="${key}"></div>`
      ).join("");
      const hourLabels = dayKeys.map(key => {
        const hour = Number(key.slice(11));
        return `<span class="${hour % 6 === 0 ? "" : "minor"}">${hour % 3 === 0 ? hour : ""}</span>`;
      }).join("");
      return `<div class="tl-day" data-day="${date}" style="flex-grow: ${dayKeys.length}">
        <button class="tl-label" data-map-day="${date}">${dayLabel(date)}</button>
        <div class="tl-bars">${bars}</div>
        <div class="tl-hours">${hourLabels}</div>
      </div>`;
    }).join("");
  }
  track.querySelectorAll(".tl-bar.active").forEach(bar => bar.classList.remove("active"));
  track.querySelectorAll(".tl-day").forEach(day => day.classList.toggle("current", state.mapTime.startsWith(day.dataset.day)));
  const active = track.querySelector(`[data-map-key="${state.mapTime}"]`);
  active.classList.add("active");

  const bubble = document.getElementById("map-bubble");
  bubble.textContent = `${dayLabel(state.mapTime.slice(0, 10))} ${state.mapTime.slice(11)}:00`;
  if (phoneTimeline()) {
    bubble.style.left = "50%";  // the bubble stays put; the strip moves
    if (!scrollingTimeline) centreBar(active);
    return;
  }
  // Put the bubble above the chosen hour's bar, inside the box at the far left and right.
  const wrap = document.getElementById("map-track-wrap").getBoundingClientRect();
  const bar = active.getBoundingClientRect();
  const centre = bar.left + bar.width / 2 - wrap.left;
  const half = bubble.offsetWidth / 2;
  bubble.style.left = `${Math.min(Math.max(centre, half), wrap.width - half)}px`;
}

// Scrolls the phone strip so this bar sits under the middle marker.
function centreBar(bar) {
  const strip = document.getElementById("map-track-scroll");
  const box = strip.getBoundingClientRect();
  const barBox = bar.getBoundingClientRect();
  strip.scrollLeft += (barBox.left + barBox.width / 2) - (box.left + box.width / 2);
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
  const sun = sportSites()[0] ? flyingWindow(sportSites()[0], date, state.settings) : null;
  document.getElementById("map-time").innerHTML =
    `${dayLabel(date)} · ${state.mapTime.slice(11)}:00` +
    (sun ? `<small>☀ ${formatHours(sun.sunrise)}–${formatHours(sun.sunset)} · ${tideRange(date)}</small>` : "");

  pinLayer.clearLayers();
  for (const site of sportSites()) {
    const forecastHour = (state.forecasts[site.id] || []).find(hour => hour.key === state.mapTime);
    const hour = forecastHour && withWaves(site, forecastHour);
    // Your sites are big pins with a gold ring and star, so they stand out.
    // They show the wind speed, or for surf spots the wave height.
    const shown = hour && hourValue(site, hour);
    const html = hour
      ? `<div class="map-pin mine ${rateHour(hour, site, state.settings, state.tides[site.id])}">${shown.degrees === null ? "" : arrow(shown.degrees)}<span>${shown.value}</span><small>${shown.unit}</small><i class="pin-star">★</i></div>`
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
  if (state.sport !== "parakiting") return [];  // the site guide is for flying sites
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
  if (!map || !document.getElementById("show-library").checked || guideSites().length === 0) {
    note.textContent = "";
    return;
  }
  const bounds = map.getBounds();
  const visible = guideSites().filter(({ site }) => bounds.contains([site.lat, site.lon]));
  if (forecastLimitReached) {
    note.textContent = "Guide sites are grey because the forecast service's daily limit is reached.";
    return;
  }
  if (map.getZoom() < GUIDE_MIN_ZOOM || visible.length > MAX_RATED_GUIDE_SITES) {
    note.textContent = `Zoom in to see forecasts for the ${visible.length} guide sites in view.`;
    return;
  }
  note.textContent = "";
  const model = state.model;
  if (!libraryForecasts[model]) libraryForecasts[model] = {};
  const missing = visible.filter(({ index }) => !libraryForecasts[model][index]);
  if (missing.length === 0) return;

  note.textContent = `Loading forecasts for ${missing.length} sites…`;
  for (let start = 0; start < missing.length; start += GUIDE_BATCH) {
    const batch = missing.slice(start, start + GUIDE_BATCH);
    try {
      const results = await fetchForecasts(batch.map(({ site }) => site), model);
      batch.forEach(({ index }, i) => { libraryForecasts[model][index] = results[i]; });
    } catch {
      // Usually the free weather service asking us to slow down: try again soon.
      note.textContent = "Some sites are still grey: trying again in a minute.";
      clearTimeout(libraryTimer);
      libraryTimer = setTimeout(loadLibraryForecasts, 60000);
      break;
    }
    drawLibrary();
    drawRatedLibrary();
  }
  if (note.textContent.startsWith("Loading")) note.textContent = "";
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
  if (phoneTimeline()) return;  // phones swipe the strip, or tap an hour (below)
  track.setPointerCapture(event.pointerId);
  setMapTime(timeAtPointer(event));
});

track.addEventListener("pointermove", event => {
  if (track.hasPointerCapture(event.pointerId)) setMapTime(timeAtPointer(event));
});

// Phones: tapping an hour jumps to it.
track.addEventListener("click", event => {
  const bar = event.target.closest("[data-map-key]");
  if (bar && phoneTimeline()) setMapTime(bar.dataset.mapKey);
});

// Phones: swiping the strip moves the time to whichever hour is under the
// middle marker. (Checked once per screen refresh, not on every scroll event.)
const trackScroll = document.getElementById("map-track-scroll");
let scrollCheck = 0;
trackScroll.addEventListener("scroll", () => {
  if (!phoneTimeline() || scrollCheck) return;
  scrollCheck = requestAnimationFrame(() => {
    scrollCheck = 0;
    const box = trackScroll.getBoundingClientRect();
    const middle = box.left + box.width / 2;
    const bar = [...track.querySelectorAll(".tl-bar")].find(bar => {
      const barBox = bar.getBoundingClientRect();
      return barBox.left - 1 <= middle && middle <= barBox.right + 1;  // +1 covers the gaps between bars
    });
    if (!bar) return;
    scrollingTimeline = true;  // don't re-centre while the finger is moving the strip
    setMapTime(bar.dataset.mapKey);
    scrollingTimeline = false;
  });
});

document.getElementById("map-prev").addEventListener("click", () => stepMapTime(-1));
document.getElementById("map-next").addEventListener("click", () => stepMapTime(1));

// The left and right arrow keys step through the hours too.
track.addEventListener("keydown", event => {
  if (event.key === "ArrowLeft") stepMapTime(-1);
  if (event.key === "ArrowRight") stepMapTime(1);
});
