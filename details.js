// The hour details panel that opens when you tap an hour.

const RATING_TEXT = { good: "Good", ok: "OK", no: "No" };
const CHECK_ICONS = { good: "✓", ok: "~", no: "✕" };

// Every model's forecast for a site, fetched when first needed: site id → data.
const comparisons = {};

function showHourDetails(siteId, key) {
  const site = state.sites.find(site => site.id === siteId);
  const hour = (state.forecasts[siteId] || []).find(hour => hour.key === key);
  if (!site || !hour) return;

  const tides = state.tides[siteId];
  const checks = checkHour(hour, site, state.settings, tides);
  const rating = worstRating(checks.map(check => check.rating));
  const tide = tides && tideAt(tides, key);
  const dialog = document.getElementById("hour-dialog");
  dialog.dataset.feedbackLabel = `${site.name}, ${dayLabel(hour.date)} ${hour.hourOfDay}:00`;  // for feedback notes

  // The hours either side, for the ‹ › buttons (within the flying day,
  // carrying on into the next or previous day).
  const allHours = Object.values(siteDays(site)).flat();
  const index = allHours.findIndex(other => other.key === key);
  const previous = allHours[index - 1];
  const next = allHours[index + 1];
  const stepButton = (other, label, text) => other
    ? `<button class="btn small" data-step-site="${siteId}" data-step-key="${other.key}" aria-label="${label}">${text}</button>`
    : `<button class="btn small" disabled aria-label="${label}">${text}</button>`;

  dialog.querySelector(".dialog-content").innerHTML = `
    <div class="hour-steps">
      ${stepButton(previous, "Previous hour", `‹ ${previous ? previous.hourOfDay + ":00" : ""}`)}
      ${stepButton(next, "Next hour", `${next ? next.hourOfDay + ":00" : ""} ›`)}
    </div>
    <div class="details-head">
      <div>
        <h2>${esc(site.name)}</h2>
        <p class="muted">${dayLabel(hour.date)} · ${hour.hourOfDay}:00 · ${modelName(state.model)}</p>
      </div>
      <span class="badge ${rating}">${RATING_TEXT[rating]}</span>
    </div>
    <div class="stats">
      ${stat("Wind", `${hour.speed} <small>${unit().label}</small>`)}
      ${stat("Gusts", `${hour.gusts} <small>${unit().label}</small>`)}
      ${stat("From", `${arrow(hour.degrees)} ${hour.direction}`)}
      ${stat("Rain", `${hour.rain} <small>mm</small>`)}
    </div>
    ${tide ? `<p class="tide-detail">🌊 Tide ${tide.rising ? "rising" : "falling"} (${tide.height.toFixed(1)} m${tides.approximate ? ", approx." : ""}) ·
      ${tideSummary(tides, hour.date)} · ${tideRange(hour.date)}<br><small>Tides: ${esc(tides.source)}</small></p>` : ""}
    <ul class="checks">
      ${checks.map(check => `
        <li class="${check.rating}">
          <span class="check-icon">${CHECK_ICONS[check.rating]}</span>${check.text}
        </li>`).join("")}
    </ul>
    <div>
      <h3 class="section-title">All forecasts for this hour</h3>
      <div id="compare-models"><p class="hint">Loading…</p></div>
    </div>
    <p class="links">
      <a href="${windyPointUrl(site)}" target="_blank" rel="noopener">Open this spot's forecast on Windy ↗</a>
    </p>
    <div class="details-site-actions">
      <button class="btn small" data-remove-site="${site.id}">★ Remove from my sites</button>
      <button class="btn small" data-edit-site="${site.id}">Edit site</button>
    </div>`;
  if (!dialog.open) dialog.showModal();
  showModelComparison(site, hour);
}

// The ‹ › buttons, and the left and right arrow keys, move an hour at a time.
document.getElementById("hour-dialog").addEventListener("click", event => {
  const button = event.target.closest("[data-step-key]");
  if (button) showHourDetails(button.dataset.stepSite, button.dataset.stepKey);
});

document.getElementById("hour-dialog").addEventListener("keydown", event => {
  const buttons = document.querySelectorAll("#hour-dialog .hour-steps button");
  if (event.key === "ArrowLeft") buttons[0].click();
  if (event.key === "ArrowRight") buttons[1].click();
});

function stat(label, value) {
  return `<div class="stat"><span>${label}</span><strong>${value}</strong></div>`;
}

// A model's name with its details underneath, e.g. "ECMWF / European centre, 25 km".
function modelLabel(model) {
  return `${model.name}<small>${model.detail}</small>`;
}

// Windy's own forecast for this exact spot (its "point forecast" page).
function windyPointUrl(site) {
  const lat = site.lat.toFixed(3);
  const lon = site.lon.toFixed(3);
  return `https://www.windy.com/${lat}/${lon}?wind,${lat},${lon},11`;
}

function modelName(id) {
  return MODELS.find(model => model.id === id).name;
}

// A small table of what every model says for this hour. When the models
// agree, the forecast is more likely to be right.
async function showModelComparison(site, hour) {
  const box = document.getElementById("compare-models");
  try {
    if (!comparisons[site.id]) {
      const url = forecastUrl(site, MODELS.map(model => model.id).join(","));
      comparisons[site.id] = await fetchJson(url);
    }
    const data = comparisons[site.id].hourly;
    const i = data.time.findIndex(time => time.startsWith(hour.key));

    const rows = MODELS.map(model => {
      const speed = data[`wind_speed_10m_${model.id}`]?.[i];
      if (speed === null || speed === undefined) {
        return `<tr><td>${modelLabel(model)}</td><td colspan="3" class="muted">no forecast this far ahead</td></tr>`;
      }
      const gusts = data[`wind_gusts_10m_${model.id}`][i];
      const degrees = data[`wind_direction_10m_${model.id}`][i];
      const current = model.id === state.model ? ' class="current"' : "";
      return `<tr${current}>
        <td>${modelLabel(model)}</td>
        <td><strong>${Math.round(speed)}</strong> ${unit().label}</td>
        <td>${Math.round(gusts)} gust</td>
        <td>${arrow(degrees)} ${degreesToCompass(degrees)}</td>
      </tr>`;
    }).join("");
    box.innerHTML = `<table class="compare">${rows}</table>`;
  } catch {
    box.innerHTML = '<p class="error">Couldn\'t load the other forecasts.</p>';
  }
}
