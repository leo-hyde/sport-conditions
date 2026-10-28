// The add / edit site panel, with place search and the compass picker.

const siteForm = document.getElementById("site-form");
const siteDialog = document.getElementById("site-dialog");

let editingId = null;  // the id of the site being edited, or null when adding
let pickedDirections = {};  // compass point → "good", "ok" or "no" (wind, or swell for surf spots)
let pickedOffshore = {};  // surf spots: compass point → "good" (offshore) or "no"
let foundPlaces = [];  // the latest place search results
let fromGuide = false;  // true if the site was picked from the site guide

// Pass a site id to edit that site, or nothing to add a new one. `place`
// can give a starting location, e.g. from a pin dropped on the map.
function openSiteForm(siteId, place = null) {
  const site = state.sites.find(site => site.id === siteId);
  editingId = site ? site.id : null;
  fromGuide = false;

  document.getElementById("site-form-title").textContent = site ? "Edit site" : "Add site";
  document.getElementById("delete-site").hidden = !site;
  document.getElementById("site-error").hidden = true;
  document.getElementById("place-search").value = "";
  document.getElementById("search-results").innerHTML = "";
  siteForm.name.value = site ? site.name : "";
  siteForm.lat.value = site ? site.lat : "";
  siteForm.lon.value = site ? site.lon : "";
  if (place) {
    siteForm.lat.value = place.lat.toFixed(4);
    siteForm.lon.value = place.lon.toFixed(4);
  }

  siteForm.beach.checked = Boolean(site && site.beach);
  showTideRule(site && site.tideRule);
  pickedDirections = directionRatings(site || { goodDirections: [], okDirections: [] });
  showSurfFields(site);
  drawCompass();
  siteDialog.showModal();
}

// Surf spots have swell directions (not wind), offshore wind directions and a
// Surfline link, and are always on a beach.
function showSurfFields(site) {
  const surf = state.sport === "surfing";
  document.getElementById("compass-label").textContent = surf ? "Swell directions (where the waves come from)" : "Wind directions";
  document.getElementById("offshore-field").hidden = !surf;
  document.getElementById("surfline-field").hidden = !surf;
  document.getElementById("beach-field").hidden = surf;
  siteForm.surfline.value = (site && site.surfline) || "";
  pickedOffshore = directionRatings({ goodDirections: (site && site.offshore) || [], okDirections: [] });
  drawOffshoreCompass();
}

// ---------- Compass picker ----------

// `focus` is the wedge Tab lands on; `moveKeyboard` puts the keyboard there now.
function drawCompass(focus = "N", moveKeyboard = false) {
  const name = state.sport === "surfing" ? "Swell directions" : "Wind directions";
  document.getElementById("compass").innerHTML = `
    ${compassSvg(pickedDirections, { labels: true, name, focus })}
    <div class="legend">
      <span><i class="good"></i>Good</span>
      <span><i class="ok"></i>OK</span>
      <span><i style="background: var(--surface-2); border: 1px solid var(--border)"></i>No</span>
    </div>`;
  if (moveKeyboard) focusWedge("compass", focus);
}

// The offshore compass is just on (green) or off.
function drawOffshoreCompass(focus = "N", moveKeyboard = false) {
  document.getElementById("offshore-compass").innerHTML = compassSvg(pickedOffshore,
    { labels: true, size: 220, name: "Offshore wind directions", focus, states: { good: "offshore", no: "not offshore" } });
  if (moveKeyboard) focusWedge("offshore-compass", focus);
}

// Tapping a wedge cycles it: no → OK → good → no.
function cycleDirection(direction, fromKeyboard) {
  const next = { no: "ok", ok: "good", good: "no" };
  pickedDirections[direction] = next[pickedDirections[direction]];
  drawCompass(direction, fromKeyboard);
}

function toggleOffshore(direction, fromKeyboard) {
  pickedOffshore[direction] = pickedOffshore[direction] === "good" ? "no" : "good";
  drawOffshoreCompass(direction, fromKeyboard);
}

// Moves the keyboard to one wedge (the only one Tab stops on).
function focusWedge(compassId, direction) {
  document.querySelectorAll(`#${compassId} [data-dir]`).forEach(wedge => {
    wedge.setAttribute("tabindex", wedge.dataset.dir === direction ? "0" : "-1");
  });
  document.querySelector(`#${compassId} [data-dir="${direction}"]`).focus();
}

// Taps, and the keyboard: Tab to the ring, arrow keys to go round it,
// Enter or Space to change the direction.
function listenToCompass(compassId, change) {
  const compass = document.getElementById(compassId);
  compass.addEventListener("click", event => {
    const wedge = event.target.closest("[data-dir]");
    if (wedge) change(wedge.dataset.dir, false);
  });
  compass.addEventListener("keydown", event => {
    const wedge = event.target.closest("[data-dir]");
    if (!wedge) return;
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      change(wedge.dataset.dir, true);
    } else if (step) {
      event.preventDefault();
      focusWedge(compassId, COMPASS[(COMPASS.indexOf(wedge.dataset.dir) + step + 16) % 16]);
    }
  });
}
listenToCompass("compass", cycleDirection);
listenToCompass("offshore-compass", toggleOffshore);

// ---------- Tide rule ----------

// The form shows a rule as e.g. "Not near low water" "within 2 h".
function showTideRule(rule) {
  siteForm.tideRule.value = rule ? `${rule.mode}-${rule.water}` : "";
  siteForm.tideHours.value = rule ? rule.hours : 2;
}

function pickedTideRule() {
  if (!siteForm.tideRule.value) return null;
  const [mode, water] = siteForm.tideRule.value.split("-");
  return { mode, water, hours: Number(siteForm.tideHours.value) || 2 };
}

// ---------- Place search ----------

async function searchPlaces() {
  const query = document.getElementById("place-search").value.trim();
  const results = document.getElementById("search-results");
  if (!query) return;

  // Sites from the guide come first (surf spots when surfing): choosing one
  // fills in its directions too. Then towns and places from Open-Meteo.
  const sites = (state.sport === "surfing" ? SURF_SPOTS : SITE_LIBRARY)
    .filter(site => site.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5)
    .map(site => ({ site }));

  results.innerHTML = '<p class="hint">Searching…</p>';
  let places = [];
  try {
    const url = "https://geocoding-api.open-meteo.com/v1/search?" +
      new URLSearchParams({ name: query, count: 5, language: "en" });
    const data = await fetch(url).then(response => response.json());
    places = (data.results || []).map(place => ({ place }));
  } catch {
    if (sites.length === 0) {
      results.innerHTML = '<p class="error">Search failed. Check your connection.</p>';
      return;
    }
  }

  foundPlaces = [...sites, ...places];
  results.innerHTML = foundPlaces.length === 0
    ? '<p class="hint">Nothing found. Try a nearby town.</p>'
    : foundPlaces.map(({ site, place }, i) => {
        if (site) {
          return `<button type="button" data-place="${i}">${currentSport().icon} ${esc(site.name)}
            <span class="muted">site guide · good ${site.goodDirections.join(" ") || "–"}</span></button>`;
        }
        const area = [place.admin1, place.country].filter(Boolean).join(", ");
        return `<button type="button" data-place="${i}">📍 ${esc(place.name)} <span class="muted">${esc(area)}</span></button>`;
      }).join("");
}

document.getElementById("place-search-btn").addEventListener("click", searchPlaces);

// Pressing Enter in the search box searches, instead of saving the form.
document.getElementById("place-search").addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    searchPlaces();
  }
});

// Choosing a result fills in the location (and the name, if it's empty).
document.getElementById("search-results").addEventListener("click", event => {
  const button = event.target.closest("[data-place]");
  if (!button) return;
  const { site, place } = foundPlaces[button.dataset.place];
  if (site) {
    fromGuide = true;
    siteForm.name.value = site.name;
    siteForm.lat.value = site.lat;
    siteForm.lon.value = site.lon;
    siteForm.beach.checked = Boolean(site.beach);
    showTideRule(site.tideRule || (site.notHighTide ? { mode: "avoid", water: "high", hours: 1.5 } : null));
    pickedDirections = directionRatings(site);
    drawCompass();
    if (state.sport === "surfing") showSurfFields(site);
  } else {
    siteForm.lat.value = place.latitude.toFixed(4);
    siteForm.lon.value = place.longitude.toFixed(4);
    if (!siteForm.name.value) siteForm.name.value = place.name;
  }
  document.getElementById("search-results").innerHTML = "";
});

// ---------- Saving and deleting ----------

siteForm.addEventListener("submit", async event => {
  event.preventDefault();  // stop the browser reloading the page

  const goodDirections = COMPASS.filter(point => pickedDirections[point] === "good");
  const okDirections = COMPASS.filter(point => pickedDirections[point] === "ok");
  const surf = state.sport === "surfing";
  const error = document.getElementById("site-error");
  if (goodDirections.length + okDirections.length === 0) {
    error.textContent = `Tap the compass to pick at least one ${surf ? "swell" : "wind"} direction.`;
    error.hidden = false;
    return;
  }
  const surfline = siteForm.surfline.value.trim();
  if (surf && surfline && !isSurflineUrl(surfline)) {
    error.textContent = "The Surfline page should start with https://www.surfline.com/";
    error.hidden = false;
    return;
  }

  const site = {
    id: editingId || makeId(),
    name: siteForm.name.value.trim(),
    lat: Number(siteForm.lat.value),
    lon: Number(siteForm.lon.value),
    goodDirections,
    okDirections,
    beach: surf || siteForm.beach.checked,
    // "Added by you" unless it came from the site guide, so your own sites
    // are easy to find (and tidy up) later.
    custom: editingId ? Boolean(state.sites.find(other => other.id === editingId).custom) : !fromGuide,
    tideRule: pickedTideRule(),
    sport: state.sport,
  };
  if (surf) {
    site.offshore = COMPASS.filter(point => pickedOffshore[point] === "good");
    site.surfline = surfline;
  }

  if (editingId) {
    const index = state.sites.findIndex(existing => existing.id === editingId);
    state.sites[index] = site;
  } else {
    state.sites.push(site);
  }
  saveSites(state.sites);
  siteDialog.close();
  render();

  // Fetch this site's forecast: it's new, or its location may have changed.
  await loadSite(site);
  render();
});

document.getElementById("delete-site").addEventListener("click", () => {
  const site = state.sites.find(site => site.id === editingId);
  if (!confirm(`Delete ${site.name}?`)) return;
  state.sites = state.sites.filter(other => other.id !== editingId);
  delete state.forecasts[editingId];
  saveSites(state.sites);
  siteDialog.close();
  render();
});

document.getElementById("reset-sites").addEventListener("click", () => {
  if (!confirm("Replace all your sites with the starter list?")) return;
  state.sites = starterSites();
  saveSites(state.sites);
  document.getElementById("settings-dialog").close();
  refresh();
});
