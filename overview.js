// The Overview tab: three layouts that each answer "where works, when?".
// Leo will try them all, and we'll keep the best one (or two).

function renderOverview() {
  document.querySelectorAll("#overview-switch button").forEach(button => {
    button.classList.toggle("active", button.dataset.layout === state.layout);
  });

  const box = document.getElementById("overview");
  if (state.sites.length === 0) {
    box.innerHTML = '<p class="muted">No sites yet. Add one in the Sites tab.</p>';
    return;
  }
  if (!state.updatedAt) {
    box.innerHTML = '<p class="muted">Loading forecast…</p>';
    return;
  }
  const layouts = { days: overviewByDay, hours: overviewByHour, best: overviewBestTimes };
  box.innerHTML = layouts[state.layout]();
}

// Every site with its rated days, worked out once per drawing.
function ratedSites() {
  return state.sites.map(site => ({ site, days: siteDays(site) }));
}

// All the dates in the forecast, e.g. ["2026-10-21", "2026-10-22", …].
function forecastDates(sites) {
  const dates = new Set();
  sites.forEach(({ days }) => Object.keys(days).forEach(date => dates.add(date)));
  return [...dates].sort();
}

const count = (hours, rating) => hours.filter(hour => hour.rating === rating).length;

// "15:00–19:00": from the first hour's start to the last hour's end.
function timeSpan(hours) {
  const end = String(Number(hours[hours.length - 1].hourOfDay) + 1).padStart(2, "0");
  return `${hours[0].hourOfDay}:00–${end}:00`;
}

// ---------- A. By day: sites down the side, days across ----------

function overviewByDay() {
  const sites = ratedSites();
  const dates = forecastDates(sites);

  const rows = sites.map(({ site, days }) => {
    const cells = dates.map(date => {
      const hours = (days[date] || []).filter(hour => !hour.past);
      const flyable = hours.filter(hour => hour.rating !== "no");
      const good = count(hours, "good");
      const ok = count(hours, "ok");
      const best = good > 0 ? "good" : ok > 0 ? "ok" : "no";
      const text = [good && `${good}h good`, ok && `${ok}h OK`].filter(Boolean).join("<br>") || "–";
      const when = flyable.length > 0 ? `<small>${timeSpan(flyable)}</small>` : "";
      return `<td class="cell ${best}" data-goto-site="${site.id}">${text}${when}</td>`;
    }).join("");
    return `<tr>
      <td class="site-name"><button class="site-link" data-goto-site="${site.id}">${esc(site.name)}</button></td>
      ${cells}
    </tr>`;
  }).join("");

  return `<table class="by-day">
    <thead><tr><th></th>${dates.map(date => `<th>${dayLabel(date)}</th>`).join("")}</tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

// ---------- B. By hour: a heatmap per day, sites down the side ----------

function overviewByHour() {
  const sites = ratedSites();

  return forecastDates(sites).map(date => {
    // The columns are this day's daylight hours, e.g. ["08", "09", …].
    const hourLabels = [...new Set(sites.flatMap(({ days }) =>
      (days[date] || []).map(hour => hour.hourOfDay)))].sort();

    let cells = "<div></div>" + hourLabels.map(label => `<div class="hm-head">${label}</div>`).join("");
    for (const { site, days } of sites) {
      cells += `<button class="hm-site site-link" data-goto-site="${site.id}">${esc(site.name)}</button>`;
      for (const label of hourLabels) {
        const hour = (days[date] || []).find(hour => hour.hourOfDay === label);
        cells += hour ? hourBlock(site, hour, { compact: true }) : "<div></div>";
      }
    }

    const columns = `minmax(76px, 140px) repeat(${hourLabels.length}, 1fr)`;
    return `<div class="heatmap-day">
      <h3>${dayLabel(date)}</h3>
      <div class="heatmap" style="grid-template-columns: ${columns}">${cells}</div>
    </div>`;
  }).join("");
}

// ---------- C. Best times: flyable windows, best first ----------

// Splits a day's hours into runs of back-to-back flyable (good or OK) hours.
function flyableWindows(site, hours) {
  const windows = [];
  let current = null;
  for (const hour of hours) {
    if (!hour.past && hour.rating !== "no") {
      if (!current) {
        current = { site, hours: [] };
        windows.push(current);
      }
      current.hours.push(hour);
    } else {
      current = null;  // a "no" hour ends the window
    }
  }
  return windows;
}

function overviewBestTimes() {
  const sites = ratedSites();

  return forecastDates(sites).map(date => {
    const windows = sites.flatMap(({ site, days }) => flyableWindows(site, days[date] || []));
    // A good hour scores 2 and an OK hour scores 1; the highest score comes first.
    const score = slot => count(slot.hours, "good") * 2 + count(slot.hours, "ok");
    windows.sort((a, b) => score(b) - score(a));

    const list = windows.length === 0
      ? '<p class="muted">Nothing flyable</p>'
      : windows.map(windowCard).join("");
    return `<div class="best-day"><h3>${dayLabel(date)}</h3>${list}</div>`;
  }).join("");
}

function windowCard(slot, index) {
  const { site, hours } = slot;
  const good = count(hours, "good");
  const ok = count(hours, "ok");
  const speeds = hours.map(hour => hour.speed);
  const low = Math.min(...speeds);
  const high = Math.max(...speeds);
  const directions = [...new Set(hours.map(hour => hour.direction))].join(", ");
  const amounts = [good && `${good}h good`, ok && `${ok}h OK`].filter(Boolean).join(", ");

  return `<div class="window">
    <div class="window-title"><span class="rank">${index + 1}</span>${esc(site.name)}</div>
    <div class="window-time">${timeSpan(hours)}</div>
    <div class="window-meta">${amounts} · ${directions} · ${low === high ? low : `${low}–${high}`} mph</div>
    <div class="hours">${hours.map(hour => hourBlock(site, hour)).join("")}</div>
  </div>`;
}
