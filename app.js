// The main file: holds the app's state, fetches forecasts and draws the page.
// Other files: sites.js (site guide, made from data/sites.csv), weather.js
// (forecasts and ratings), sun.js (daylight), tides.js, compass.js,
// storage.js (saving), details.js (hour details), settings.js,
// sitesForm.js (add / edit sites), overview.js and map.js (the tabs).

// Everything the app knows, in one place.
const state = {
  sites: loadSites(),
  settings: loadSettings(),
  model: loadSaved("sc.model", MODELS[0].id),  // which forecast model
  forecastCache: {},  // model id → { site id → list of hours }
  tides: {},  // site id → tides (coastal sites only)
  updatedAt: null,
  failedSites: [],
  view: loadSaved("sc.view", "overview"),  // which tab is showing
  layout: loadSaved("sc.layout", "days"),  // which Overview layout
  mapTime: null,  // the hour the map is showing, e.g. "2026-10-21T14"

  // The forecasts for the chosen model: { site id → list of hours }.
  // A "getter" looks like a normal property but runs this code each time.
  get forecasts() {
    if (!this.forecastCache[this.model]) this.forecastCache[this.model] = {};
    return this.forecastCache[this.model];
  },
};

// ---------- Fetching ----------

// Fetch one site's forecast (for the chosen model) and, if it's coastal,
// its tides. Failures are noted so the status line can mention them.
async function loadSite(site, { tides = true } = {}) {
  const [forecast, tideData] = await Promise.allSettled([
    fetchForecast(site, state.model),
    tides && site.coastal ? fetchTides(site) : Promise.resolve(null),
  ]);
  if (forecast.status === "fulfilled") state.forecasts[site.id] = forecast.value;
  else state.failedSites.push(site.name);
  if (tideData.status === "fulfilled" && tideData.value) state.tides[site.id] = tideData.value;
}

// Fetch everything again, for every site at the same time.
async function refresh() {
  setStatus("Loading forecast…");
  state.failedSites = [];
  state.forecastCache = {};
  await Promise.all(state.sites.map(site => loadSite(site)));
  state.updatedAt = new Date();
  render();
}

// Switching model only fetches that model's forecasts (tides don't change),
// and only the first time: after that it's remembered.
async function changeModel(model) {
  state.model = model;
  save("sc.model", model);
  const missing = state.sites.filter(site => !state.forecasts[site.id]);
  if (missing.length > 0) {
    setStatus("Loading forecast…");
    state.failedSites = [];
    await Promise.all(missing.map(site => loadSite(site, { tides: false })));
  }
  render();
}

function setStatus(text) {
  document.getElementById("status").textContent = text;
}

function statusText() {
  if (!state.updatedAt) return "Loading forecast…";
  const time = state.updatedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  let text = `Updated ${time}`;
  if (state.failedSites.length > 0) text += ` · couldn't load ${state.failedSites.join(", ")}`;
  return text;
}

// ---------- Preparing the data ----------

// A site's flyable-time hours, rated and grouped by day:
// { "2026-10-21": [hour, hour, …], … }
// Ratings are worked out here (not when fetching), so changing a setting
// re-colours everything instantly without fetching again.
function siteDays(site) {
  const days = {};
  const now = londonNowKey();
  const tides = state.tides[site.id];
  const windows = {};  // date → flying window, worked out once per day

  for (const hour of state.forecasts[site.id] || []) {
    if (!windows[hour.date]) windows[hour.date] = flyingWindow(site, hour.date, state.settings);
    const hourNum = Number(hour.hourOfDay);
    if (hourNum < windows[hour.date].start || hourNum > windows[hour.date].end) continue;

    if (!days[hour.date]) days[hour.date] = [];
    days[hour.date].push({
      ...hour,
      rating: rateHour(hour, site, state.settings, tides),
      past: hour.key < now,
    });
  }
  return days;
}

// "Today", "Tomorrow", or e.g. "Fri 23".
function dayLabel(date) {
  const today = londonNowKey().slice(0, 10);
  const daysAway = Math.round((Date.parse(date) - Date.parse(today)) / DAY_MS);
  if (daysAway === 0) return "Today";
  if (daysAway === 1) return "Tomorrow";
  return new Date(date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
}

// "HW 02:10 14:31 · LW 08:22 20:40", for one day's tides.
function tideSummary(tides, date) {
  const turns = tides.turns.filter(turn => turn.date === date);
  const times = type => turns.filter(turn => turn.type === type).map(turn => formatHours(turn.hours)).join(" ");
  return [turns.some(t => t.type === "high") && `HW ${times("high")}`,
          turns.some(t => t.type === "low") && `LW ${times("low")}`].filter(Boolean).join(" · ");
}

// ---------- Small HTML helpers ----------

// Site names are typed in by people, so we "escape" them before putting
// them in the page. Otherwise a name like "<b>" would be treated as HTML.
function esc(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// An arrow pointing the way the wind blows. Wind "from" 0° (north)
// blows south, so a down arrow rotated by the direction is right.
function arrow(degrees) {
  return `<span class="arrow" style="transform: rotate(${degrees}deg)">↓</span>`;
}

// One tappable block for one hour. The compact version (for the
// By hour heatmap) shows just the speed.
function hourBlock(site, hour, { compact = false } = {}) {
  const label = `${hour.hourOfDay}:00, ${hour.speed} mph from ${hour.direction}, ${RATING_TEXT[hour.rating]}`;
  const inside = compact
    ? `<span class="speed">${hour.speed}</span>`
    : `<span class="time">${hour.hourOfDay}</span>${arrow(hour.degrees)}<span class="speed">${hour.speed}</span>`;
  return `<button class="hour ${hour.rating} ${hour.past ? "past" : ""}"
      data-site="${site.id}" data-key="${hour.key}" aria-label="${label}">${inside}</button>`;
}

// ---------- Drawing the page ----------

function render() {
  setStatus(statusText());
  document.getElementById("model-select").value = state.model;
  renderOverview();
  renderSiteCards();
  renderMap();
}

// Show one tab and hide the others.
function showView(view) {
  state.view = view;
  save("sc.view", view);
  document.querySelectorAll("#tabs button").forEach(button => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  for (const name of ["overview", "sites", "map"]) {
    document.getElementById(`view-${name}`).hidden = name !== view;
  }
  render();
}

// One card per site, with one strip of hour blocks per day.
function renderSiteCards() {
  const cards = document.getElementById("site-cards");
  if (state.sites.length === 0) {
    cards.innerHTML = '<p class="muted">No sites yet. Add one, or pick from the map.</p>';
    return;
  }
  cards.innerHTML = state.sites.map(site => {
    const tides = state.tides[site.id];
    const days = Object.entries(siteDays(site));
    const strips = days.length === 0
      ? '<p class="muted">No forecast yet</p>'
      : days.map(([date, hours]) => {
          const sun = flyingWindow(site, date, state.settings);
          const tideLine = tides
            ? `<div class="tide-line">🌊 ${tideSummary(tides, date)} · ${tideRange(date)}</div>`
            : "";
          return `<div class="day">
            <div class="day-label">${dayLabel(date)}<small>☀ ${formatHours(sun.sunrise)}–${formatHours(sun.sunset)}</small></div>
            <div class="day-main">
              <div class="hours">${hours.map(hour => hourBlock(site, hour)).join("")}</div>
              ${tideLine}
            </div>
          </div>`;
        }).join("");

    const tags = [site.coastal && "Coastal", site.notHighTide && "Not at high tide"].filter(Boolean)
      .map(tag => `<span class="tag">${tag}</span>`).join("");
    return `<article class="card site" id="site-${site.id}">
      <header class="card-head">
        <div class="site-title">
          ${compassSvg(directionRatings(site), { size: 36 })}
          <div><h3>${esc(site.name)}</h3><div class="tags">${tags}</div></div>
        </div>
        <button class="btn small" data-edit-site="${site.id}">Edit</button>
      </header>
      ${strips}
    </article>`;
  }).join("");
}

// ---------- Buttons and taps ----------

// One listener for the whole page handles taps on any hour block,
// including ones drawn later. This is called "event delegation".
document.addEventListener("click", event => {
  const block = event.target.closest("[data-key]");
  if (block) showHourDetails(block.dataset.site, block.dataset.key);

  const editButton = event.target.closest("[data-edit-site]");
  if (editButton) openSiteForm(editButton.dataset.editSite);

  // Site names in the Overview jump to that site's card in the Sites tab.
  const siteLink = event.target.closest("[data-goto-site]");
  if (siteLink && !block) {
    showView("sites");
    document.getElementById(`site-${siteLink.dataset.gotoSite}`).scrollIntoView({ behavior: "smooth" });
  }

  const tab = event.target.closest("#tabs [data-view]");
  if (tab) showView(tab.dataset.view);

  const layoutButton = event.target.closest("#overview-switch [data-layout]");
  if (layoutButton) {
    state.layout = layoutButton.dataset.layout;
    save("sc.layout", state.layout);
    renderOverview();
  }

  // Any button marked data-close closes the dialog it's in.
  if (event.target.closest("[data-close]")) event.target.closest("dialog").close();
});

// Tapping the dark area outside a dialog closes it.
document.querySelectorAll("dialog").forEach(dialog => {
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });
});

// The forecast model picker.
const modelSelect = document.getElementById("model-select");
modelSelect.innerHTML = MODELS.map(model =>
  `<option value="${model.id}">${model.name}</option>`).join("");
modelSelect.addEventListener("change", () => changeModel(modelSelect.value));

document.getElementById("refresh").addEventListener("click", refresh);
document.getElementById("open-settings").addEventListener("click", openSettings);
document.getElementById("add-site").addEventListener("click", () => openSiteForm());

showView(state.view);
refresh();
