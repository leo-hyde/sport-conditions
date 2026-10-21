// The add / edit site panel, with place search and the compass picker.

const siteForm = document.getElementById("site-form");
const siteDialog = document.getElementById("site-dialog");

let editingId = null;  // the id of the site being edited, or null when adding
let directionRatings = {};  // compass point → "good", "ok" or "no"
let foundPlaces = [];  // the latest place search results

// Pass a site id to edit that site, or nothing to add a new one.
function openSiteForm(siteId) {
  const site = state.sites.find(site => site.id === siteId);
  editingId = site ? site.id : null;

  document.getElementById("site-form-title").textContent = site ? "Edit site" : "Add site";
  document.getElementById("delete-site").hidden = !site;
  document.getElementById("site-error").hidden = true;
  document.getElementById("place-search").value = "";
  document.getElementById("search-results").innerHTML = "";
  siteForm.name.value = site ? site.name : "";
  siteForm.lat.value = site ? site.lat : "";
  siteForm.lon.value = site ? site.lon : "";

  directionRatings = {};
  for (const point of COMPASS) {
    if (site && site.goodDirections.includes(point)) directionRatings[point] = "good";
    else if (site && site.okDirections.includes(point)) directionRatings[point] = "ok";
    else directionRatings[point] = "no";
  }
  drawCompass();
  siteDialog.showModal();
}

// ---------- Compass picker ----------

// Draws 16 wedges in a ring as an SVG (a drawing made of shapes).
// Angles are measured clockwise from north, like a compass.
function drawCompass() {
  const centre = 130;
  const outer = 120;
  const inner = 44;

  // The x, y position at a given angle and distance from the centre.
  const point = (angle, radius) => {
    const radians = angle * Math.PI / 180;
    return [centre + radius * Math.sin(radians), centre - radius * Math.cos(radians)];
  };

  const wedges = COMPASS.map((name, i) => {
    const start = i * 22.5 - 11.25;
    const end = i * 22.5 + 11.25;
    const [x1, y1] = point(start, inner);
    const [x2, y2] = point(start, outer);
    const [x3, y3] = point(end, outer);
    const [x4, y4] = point(end, inner);
    const [labelX, labelY] = point(i * 22.5, (inner + outer) / 2);
    return `<g class="wedge ${directionRatings[name]}" data-dir="${name}">
      <path d="M${x1},${y1} L${x2},${y2} A${outer},${outer} 0 0 1 ${x3},${y3} L${x4},${y4} A${inner},${inner} 0 0 0 ${x1},${y1} Z"/>
      <text x="${labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="central">${name}</text>
    </g>`;
  }).join("");

  document.getElementById("compass").innerHTML = `
    <svg viewBox="0 0 260 260" role="group" aria-label="Wind directions">
      ${wedges}
      <text class="compass-centre" x="${centre}" y="${centre}" text-anchor="middle" dominant-baseline="central">Tap to set</text>
    </svg>
    <div class="legend">
      <span><i class="good"></i>Good</span>
      <span><i class="ok"></i>OK</span>
      <span><i style="background: var(--surface-2); border: 1px solid var(--border)"></i>No</span>
    </div>`;
}

// Tapping a wedge cycles it: no → OK → good → no.
document.getElementById("compass").addEventListener("click", event => {
  const wedge = event.target.closest("[data-dir]");
  if (!wedge) return;
  const next = { no: "ok", ok: "good", good: "no" };
  directionRatings[wedge.dataset.dir] = next[directionRatings[wedge.dataset.dir]];
  drawCompass();
});

// ---------- Place search ----------

async function searchPlaces() {
  const query = document.getElementById("place-search").value.trim();
  const results = document.getElementById("search-results");
  if (!query) return;

  results.innerHTML = '<p class="hint">Searching…</p>';
  try {
    const url = "https://geocoding-api.open-meteo.com/v1/search?" +
      new URLSearchParams({ name: query, count: 5, language: "en" });
    const data = await fetch(url).then(response => response.json());
    foundPlaces = data.results || [];
    results.innerHTML = foundPlaces.length === 0
      ? '<p class="hint">No places found. Try a nearby town.</p>'
      : foundPlaces.map((place, i) => {
          const area = [place.admin1, place.country].filter(Boolean).join(", ");
          return `<button type="button" data-place="${i}">${esc(place.name)} <span class="muted">${esc(area)}</span></button>`;
        }).join("");
  } catch {
    results.innerHTML = '<p class="error">Search failed. Check your connection.</p>';
  }
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
  const place = foundPlaces[button.dataset.place];
  siteForm.lat.value = place.latitude.toFixed(4);
  siteForm.lon.value = place.longitude.toFixed(4);
  if (!siteForm.name.value) siteForm.name.value = place.name;
  document.getElementById("search-results").innerHTML = "";
});

// ---------- Saving and deleting ----------

siteForm.addEventListener("submit", async event => {
  event.preventDefault();  // stop the browser reloading the page

  const goodDirections = COMPASS.filter(point => directionRatings[point] === "good");
  const okDirections = COMPASS.filter(point => directionRatings[point] === "ok");
  if (goodDirections.length + okDirections.length === 0) {
    const error = document.getElementById("site-error");
    error.textContent = "Tap the compass to pick at least one wind direction.";
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
  };

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
  try {
    state.forecasts[site.id] = await fetchForecast(site);
  } catch {
    state.failedSites.push(site.name);
  }
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
