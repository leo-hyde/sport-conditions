// The add / edit site panel, with place search and the compass picker.

const siteForm = document.getElementById("site-form");
const siteDialog = document.getElementById("site-dialog");

let editingId = null;  // the id of the site being edited, or null when adding
let pickedDirections = {};  // compass point → "good", "ok" or "no"
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

  siteForm.coastal.checked = Boolean(site && site.coastal);
  siteForm.notHighTide.checked = Boolean(site && site.notHighTide);
  pickedDirections = directionRatings(site || { goodDirections: [], okDirections: [] });
  drawCompass();
  siteDialog.showModal();
}

// ---------- Compass picker ----------

function drawCompass() {
  document.getElementById("compass").innerHTML = `
    ${compassSvg(pickedDirections, { labels: true })}
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
  pickedDirections[wedge.dataset.dir] = next[pickedDirections[wedge.dataset.dir]];
  drawCompass();
});

// ---------- Place search ----------

async function searchPlaces() {
  const query = document.getElementById("place-search").value.trim();
  const results = document.getElementById("search-results");
  if (!query) return;

  // Flying sites from the site guide come first: choosing one fills in its
  // wind directions too. Then towns and places from Open-Meteo.
  const sites = SITE_LIBRARY
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
          return `<button type="button" data-place="${i}">🪂 ${esc(site.name)}
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
    siteForm.name.value = site.name;
    siteForm.lat.value = site.lat;
    siteForm.lon.value = site.lon;
    siteForm.coastal.checked = Boolean(site.coastal);
    siteForm.notHighTide.checked = Boolean(site.notHighTide);
    pickedDirections = directionRatings(site);
    drawCompass();
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
    coastal: siteForm.coastal.checked,
    notHighTide: siteForm.notHighTide.checked,
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
