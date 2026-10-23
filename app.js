// The main file: holds the app's state, fetches forecasts and draws the page.
// Other files: sites.js (site guide, made from data/sites.csv), weather.js
// (forecasts and ratings), sun.js (daylight), tides.js, compass.js,
// storage.js (saving), details.js (hour details), settings.js,
// sitesForm.js (add / edit sites), overview.js and map.js (the tabs).

// Everything the app knows, in one place.
const state = {
  sites: loadSites(),
  sport: loadSaved("sc.sport", "parakiting"),  // which sport (see sports.js)
  settings: loadSettings(loadSaved("sc.sport", "parakiting")),  // that sport's settings
  model: loadSaved("sc.model", MODELS[0].id),  // which forecast model
  forecastCache: {},  // model id → { site id → list of hours }
  tides: {},  // site id → tides (beach sites only)
  updatedAt: null,
  failedSites: [],
  // The page reopens where you left it; the very first visit lands on
  // the Overview, by day: the quickest answer.
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

// Fetch one site's forecast (for the chosen model) and, if it's on a beach,
// its tides. Failures are noted so the status line can mention them.
async function loadSite(site, { tides = true } = {}) {
  const [forecast, tideData] = await Promise.allSettled([
    fetchForecast(site, state.model),
    tides && site.beach ? fetchTides(site) : Promise.resolve(null),
  ]);
  if (forecast.status === "fulfilled") state.forecasts[site.id] = forecast.value;
  else state.failedSites.push(site.name);
  if (tideData.status === "fulfilled" && tideData.value) state.tides[site.id] = tideData.value;
}

// Fetch everything again, for every site at the same time.
async function refresh() {
  setStatus("Loading forecast…");
  document.getElementById("refresh").classList.add("spinning");
  state.failedSites = [];
  state.forecastCache = {};
  await Promise.all(state.sites.map(site => loadSite(site)));
  state.updatedAt = new Date();
  document.getElementById("refresh").classList.remove("spinning");
  render();
  retryFailedSoon();
}

// If some sites failed (usually the free weather service saying "too many
// requests, slow down"), try just those again a minute later.
let retryTimer = null;
function retryFailedSoon() {
  clearTimeout(retryTimer);
  if (state.failedSites.length === 0) return;
  retryTimer = setTimeout(async () => {
    const failed = state.sites.filter(site => state.failedSites.includes(site.name));
    state.failedSites = [];
    await Promise.all(failed.map(site => loadSite(site)));
    render();
    retryFailedSoon();
  }, 60000);
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
  let text = `${currentSport().icon} ${currentSport().name} · ${unit().label} · updated ${time}`;
  if (state.failedSites.length > 0) text += ` · couldn't load ${state.failedSites.join(", ")}`;
  return text;
}

// A clear message when the free forecast service has stopped answering for
// today, instead of a page full of grey.
function renderServiceNotice() {
  const notice = document.getElementById("service-notice");
  notice.hidden = !forecastLimitReached;
  notice.innerHTML = `<strong>No new forecasts right now.</strong> The free forecast service has
    reached its daily limit for this internet connection. It resets tomorrow, or try another
    network (e.g. mobile data). Anything saved in the last day is still shown.`;
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
  const label = `${hour.hourOfDay}:00, ${hour.speed} ${unit().label} from ${hour.direction}, ${RATING_TEXT[hour.rating]}`;
  // Compact blocks (Overview "By hour") only show a speed when the hour is
  // flyable, so the good and OK times stand out.
  const inside = compact
    ? `<span class="speed">${hour.rating === "no" ? "" : hour.speed}</span>`
    : `<span class="time">${hour.hourOfDay}</span>${arrow(hour.degrees)}<span class="speed">${hour.speed}</span>`;
  return `<button class="hour ${hour.rating} ${hour.past ? "past" : ""}"
      data-site="${site.id}" data-key="${hour.key}" aria-label="${label}">${inside}</button>`;
}

// A filled star on each of your sites: tap it to remove the site.
function starButton(site) {
  return `<button class="star" data-remove-site="${site.id}" aria-label="Remove ${esc(site.name)} from my sites" title="Remove from my sites">★</button>`;
}

// ---------- Removing sites (with undo) ----------

let lastRemoved = null;  // { site, index }, so Undo can put it back
let toastTimer = null;

function removeSite(siteId) {
  const index = state.sites.findIndex(site => site.id === siteId);
  if (index === -1) return;
  lastRemoved = { site: state.sites[index], index };
  state.sites.splice(index, 1);
  saveSites(state.sites);
  document.querySelectorAll("dialog[open]").forEach(dialog => dialog.close());
  render();
  showToast(`Removed ${esc(lastRemoved.site.name)}`, "Undo", undoRemove);
}

function undoRemove() {
  if (!lastRemoved) return;
  state.sites.splice(lastRemoved.index, 0, lastRemoved.site);
  saveSites(state.sites);
  lastRemoved = null;
  render();
}

// A small message at the bottom of the screen, with an optional button.
// It disappears by itself after 6 seconds.
function showToast(message, buttonText, onClick) {
  const toast = document.getElementById("toast");
  toast.innerHTML = `<span>${message}</span>${buttonText ? `<button class="btn small">${buttonText}</button>` : ""}`;
  toast.hidden = false;
  if (buttonText) {
    toast.querySelector("button").onclick = () => {
      toast.hidden = true;
      onClick();
    };
  }
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 6000);
}

// ---------- Drawing the page ----------

function render() {
  setStatus(statusText());
  renderServiceNotice();
  document.getElementById("model-select").value = state.model;
  document.getElementById("model-detail").textContent = MODELS.find(model => model.id === state.model).detail;
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

// Cards show today and tomorrow; tapping "Show all 7 days" opens the rest.
const SHOWN_DAYS = 2;
const expandedSites = new Set();  // ids of cards showing all days

// One card per site, with one strip of hour blocks per day.
function renderSiteCards() {
  const cards = document.getElementById("site-cards");
  if (state.sites.length === 0) {
    cards.innerHTML = '<p class="muted">No sites yet. Add one, or pick from the map.</p>';
    return;
  }
  cards.innerHTML = state.sites.map(site => {
    const tides = state.tides[site.id];
    const allDays = Object.entries(siteDays(site));
    const expanded = expandedSites.has(site.id);
    const days = expanded ? allDays : allDays.slice(0, SHOWN_DAYS);
    // A hint of what's hidden: how many good hours the later days have.
    const laterGood = allDays.slice(SHOWN_DAYS).flatMap(([, hours]) => hours).filter(hour => hour.rating === "good").length;
    const toggle = allDays.length > SHOWN_DAYS
      ? `<button class="show-more" data-expand-site="${site.id}" aria-expanded="${expanded}">
          ${expanded ? "Show fewer days ▴" : `Show all ${allDays.length} days ▾`}
          ${!expanded && laterGood ? `<span class="badge good">${laterGood}h good later</span>` : ""}
        </button>`
      : "";
    const strips = days.length === 0
      ? '<p class="muted">No forecast yet</p>'
      : days.map(([date, hours]) => {
          const sun = flyingWindow(site, date, state.settings);
          const tideLine = tides
            ? `<button class="tide-line" data-tide-site="${site.id}" data-tide-date="${date}">
                🌊 ${tideSummary(tides, date)} · ${tideRange(date)} <span class="more">Tides ›</span></button>`
            : "";
          return `<div class="day">
            <div class="day-label">${dayLabel(date)}<small>☀ ${formatHours(sun.sunrise)}–${formatHours(sun.sunset)}</small></div>
            <div class="day-main">
              <div class="hours">${hours.map(hour => hourBlock(site, hour)).join("")}</div>
              ${tideLine}
            </div>
          </div>`;
        }).join("");

    // Right now, for beach sites: e.g. "🌊 Rising · HW 17:10".
    const tideTag = tides && tideNow(tides) ? `🌊 ${tideNow(tides)}` : "";
    const tags = [site.custom && "Added by you", tideTag, tideRuleText(site.tideRule)].filter(Boolean)
      .map(tag => `<span class="tag">${tag}</span>`).join("");
    return `<article class="card site" id="site-${site.id}">
      <header class="card-head">
        <div class="site-title">
          ${compassSvg(directionRatings(site), { size: 36 })}
          <div><h3>${esc(site.name)}</h3><div class="tags">${tags}</div></div>
        </div>
        <div class="card-actions">
          ${starButton(site)}
          <button class="btn small" data-edit-site="${site.id}">Edit</button>
        </div>
      </header>
      ${strips}
      ${toggle}
    </article>`;
  }).join("");
}

// ---------- Buttons and taps ----------

// One listener for the whole page handles taps on any hour block,
// including ones drawn later. This is called "event delegation".
document.addEventListener("click", event => {
  const block = event.target.closest("[data-key]");
  if (block) showHourDetails(block.dataset.site, block.dataset.key);

  const expandButton = event.target.closest("[data-expand-site]");
  if (expandButton) {
    const id = expandButton.dataset.expandSite;
    if (expandedSites.has(id)) expandedSites.delete(id);
    else expandedSites.add(id);
    renderSiteCards();
    return;
  }

  const removeButton = event.target.closest("[data-remove-site]");
  if (removeButton) {
    removeSite(removeButton.dataset.removeSite);
    return;
  }

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

// The sport picker. Sports that aren't set up yet show as "coming soon".
const sportSelect = document.getElementById("sport-select");
sportSelect.innerHTML = SPORTS.map(sport =>
  `<option value="${sport.id}" ${sport.ready ? "" : "disabled"}>${sport.icon} ${sport.name}${sport.ready ? "" : " (coming soon)"}</option>`
).join("");
sportSelect.value = state.sport;
sportSelect.addEventListener("change", () => {
  state.sport = sportSelect.value;
  save("sc.sport", state.sport);
  state.settings = loadSettings(state.sport);
  render();
});

// The forecast model picker.
const modelSelect = document.getElementById("model-select");
modelSelect.innerHTML = MODELS.map(model =>
  `<option value="${model.id}">${model.name}</option>`).join("");
modelSelect.addEventListener("change", () => changeModel(modelSelect.value));

// ↻ fetches fresh forecasts, rather than ones saved in the last 30 minutes.
document.getElementById("refresh").addEventListener("click", async () => {
  skipSavedForecasts = true;
  forecastLimitReached = false;  // try the forecast service again
  await refresh();
  skipSavedForecasts = false;
});
document.getElementById("open-settings").addEventListener("click", openSettings);
document.getElementById("add-site").addEventListener("click", () => openSiteForm());

// Start up: if this device syncs, load the latest sites first.
showView(state.view);
(async () => {
  await checkSyncLink();
  if (syncCode()) await pullSync();
  render();
  refresh();
})();
