// The main file: holds the app's state, fetches forecasts and draws the page.
// Other files: sites.js (starter sites), weather.js (forecasts and ratings),
// storage.js (saving), details.js (hour details), settings.js (settings),
// sitesForm.js (add / edit sites), overview.js (Overview tab), map.js (Map tab).

// Everything the app knows, in one place.
const state = {
  sites: loadSites(),
  settings: loadSettings(),
  forecasts: {},  // site id → list of hours (from weather.js)
  updatedAt: null,
  failedSites: [],
  view: loadSaved("sc.view", "overview"),  // which tab is showing
  layout: loadSaved("sc.layout", "days"),  // which Overview layout
  mapTime: null,  // the hour the map is showing, e.g. "2026-10-21T14"
};

// ---------- Fetching ----------

// Fetch every site's forecast at the same time. "allSettled" means one
// site failing doesn't stop the others from showing.
async function refresh() {
  setStatus("Loading forecast…");
  const results = await Promise.allSettled(state.sites.map(fetchForecast));
  state.failedSites = [];
  results.forEach((result, i) => {
    const site = state.sites[i];
    if (result.status === "fulfilled") state.forecasts[site.id] = result.value;
    else state.failedSites.push(site.name);
  });
  state.updatedAt = new Date();
  render();
}

function setStatus(text) {
  document.getElementById("status").textContent = text;
}

function statusText() {
  if (!state.updatedAt) return "Loading forecast…";
  const time = state.updatedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  let text = `Paragliding · updated ${time}`;
  if (state.failedSites.length > 0) text += ` · couldn't load ${state.failedSites.join(", ")}`;
  return text;
}

// ---------- Preparing the data ----------

// A site's daylight hours, rated and grouped by day:
// { "2026-10-21": [hour, hour, …], … }
// Ratings are worked out here (not when fetching), so changing a setting
// re-colours everything instantly without fetching again.
function siteDays(site) {
  const days = {};
  const now = londonNowKey();
  for (const hour of state.forecasts[site.id] || []) {
    if (!hour.isDaylight) continue;
    if (!days[hour.date]) days[hour.date] = [];
    days[hour.date].push({
      ...hour,
      rating: rateHour(hour, site, state.settings),
      past: hour.key < now,
    });
  }
  return days;
}

// "Today", "Tomorrow", or e.g. "Fri 23".
function dayLabel(date) {
  const today = londonNowKey().slice(0, 10);
  const daysAway = Math.round((Date.parse(date) - Date.parse(today)) / 86400000);
  if (daysAway === 0) return "Today";
  if (daysAway === 1) return "Tomorrow";
  return new Date(date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
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
  document.getElementById("site-cards").innerHTML = state.sites.map(site => {
    const days = Object.entries(siteDays(site));
    const strips = days.length === 0
      ? '<p class="muted">No forecast yet</p>'
      : days.map(([date, hours]) => `
          <div class="day">
            <div class="day-label">${dayLabel(date)}</div>
            <div class="hours">${hours.map(hour => hourBlock(site, hour)).join("")}</div>
          </div>`).join("");
    return `<article class="card site" id="site-${site.id}">
      <header class="card-head">
        <h3>${esc(site.name)}</h3>
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

document.getElementById("refresh").addEventListener("click", refresh);
document.getElementById("open-settings").addEventListener("click", openSettings);
document.getElementById("add-site").addEventListener("click", () => openSiteForm());

showView(state.view);
refresh();
