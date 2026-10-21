// The hour details panel that opens when you tap an hour.

const RATING_TEXT = { good: "Good", ok: "OK", no: "No" };
const CHECK_ICONS = { good: "✓", ok: "~", no: "✕" };

function showHourDetails(siteId, key) {
  const site = state.sites.find(site => site.id === siteId);
  const hour = (state.forecasts[siteId] || []).find(hour => hour.key === key);
  if (!site || !hour) return;

  const checks = checkHour(hour, site, state.settings);
  const rating = worstRating(checks.map(check => check.rating));
  const dialog = document.getElementById("hour-dialog");

  dialog.querySelector(".dialog-content").innerHTML = `
    <div class="details-head">
      <div>
        <h2>${esc(site.name)}</h2>
        <p class="muted">${dayLabel(hour.date)} · ${hour.hourOfDay}:00</p>
      </div>
      <span class="badge ${rating}">${RATING_TEXT[rating]}</span>
    </div>
    <div class="stats">
      ${stat("Wind", `${hour.speed} <small>mph</small>`)}
      ${stat("Gusts", `${hour.gusts} <small>mph</small>`)}
      ${stat("From", `${arrow(hour.degrees)} ${hour.direction}`)}
      ${stat("Rain", `${hour.rain} <small>mm</small>`)}
    </div>
    <ul class="checks">
      ${checks.map(check => `
        <li class="${check.rating}">
          <span class="check-icon">${CHECK_ICONS[check.rating]}</span>${check.text}
        </li>`).join("")}
    </ul>`;
  dialog.showModal();
}

function stat(label, value) {
  return `<div class="stat"><span>${label}</span><strong>${value}</strong></div>`;
}
