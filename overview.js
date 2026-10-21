// The Overview tab: two layouts that each answer "where works, when?".

function renderOverview() {
  document.querySelectorAll("#overview-switch button").forEach(button => {
    button.classList.toggle("active", button.dataset.layout === state.layout);
  });

  const box = document.getElementById("overview");
  if (state.sites.length === 0) {
    box.innerHTML = '<p class="muted">No sites yet. Add one in the Sites tab, or pick from the map.</p>';
    return;
  }
  if (!state.updatedAt) {
    box.innerHTML = '<p class="muted">Loading forecast…</p>';
    return;
  }
  const layouts = { days: overviewByDay, hours: overviewByHour };
  document.getElementById("next-good").innerHTML = nextGoodSession();
  box.innerHTML = (layouts[state.layout] || overviewByDay)();
}

// The headline: the next stretch of good (or failing that, OK) hours at
// any of your sites, so the first thing you see answers "when can I go?".
function nextGoodSession() {
  const sessions = [];
  for (const { site, days } of ratedSites()) {
    for (const hours of Object.values(days)) {
      // Runs of back-to-back hours that are still to come and flyable.
      let run = [];
      for (const hour of [...hours, null]) {
        if (hour && !hour.past && hour.rating !== "no") {
          run.push(hour);
        } else if (run.length > 0) {
          sessions.push({ site, hours: run, good: count(run, "good") });
          run = [];
        }
      }
    }
  }
  if (sessions.length === 0) {
    return `<div class="next-good none"><strong>Nothing flyable in the next 7 days</strong>
      <span class="muted">at your sites. Check the map for other sites nearby.</span></div>`;
  }
  // The earliest session with good hours; if there are none, the earliest OK one.
  const pick = list => list.sort((a, b) => a.hours[0].key.localeCompare(b.hours[0].key))[0];
  const best = pick(sessions.filter(s => s.good > 0)) || pick(sessions);
  const rating = best.good > 0 ? "good" : "ok";
  const amount = best.good > 0 ? `${best.good}h good` : `${best.hours.length}h OK`;
  return `<button class="next-good ${rating}" data-goto-site="${best.site.id}">
    <span class="next-label">Next ${rating === "good" ? "good" : "flyable"} session</span>
    <strong>${dayLabel(best.hours[0].date)} ${shortSpan(best.hours)} · ${esc(best.site.name)}</strong>
    <span>${amount} · ${[...new Set(best.hours.map(hour => hour.direction))].join("/")} · ${speedRange(best.hours)} ${unit().label}</span>
  </button>`;
}

// "12–16": the lowest to highest wind speed over some hours.
function speedRange(hours) {
  const speeds = hours.map(hour => hour.speed);
  const low = Math.min(...speeds);
  const high = Math.max(...speeds);
  return low === high ? `${low}` : `${low}–${high}`;
}

// "16–19": a compact time span for small spaces.
function shortSpan(hours) {
  const end = Number(hours[hours.length - 1].hourOfDay) + 1;
  return `${Number(hours[0].hourOfDay)}–${end}`;
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
      const when = flyable.length > 0 ? `<small>${shortSpan(flyable)}h</small>` : "";
      return `<td class="cell ${best}" data-goto-site="${site.id}">${text}${when}</td>`;
    }).join("");
    return `<tr>
      <td class="site-name"><div class="name-cell">${starButton(site)}<button class="site-link" data-goto-site="${site.id}">${esc(site.name)}</button></div></td>
      ${cells}
    </tr>`;
  }).join("");

  // 7 days don't fit across a phone, so the table scrolls sideways
  // with the site names staying put.
  return `<div class="table-scroll"><table class="by-day">
    <thead><tr><th></th>${dates.map(date =>
      `<th>${dayLabel(date)}</th>`).join("")}</tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

// ---------- B. By hour: a heatmap per day, sites down the side ----------

function overviewByHour() {
  const sites = ratedSites();

  return forecastDates(sites).map(date => {
    // The columns are this day's flyable-time hours, e.g. ["08", "09", …].
    const hourLabels = [...new Set(sites.flatMap(({ days }) =>
      (days[date] || []).map(hour => hour.hourOfDay)))].sort();

    let cells = "<div></div>" + hourLabels.map(label => `<div class="hm-head">${label}</div>`).join("");
    for (const { site, days } of sites) {
      cells += `<div class="hm-site name-cell">${starButton(site)}<button class="site-link" data-goto-site="${site.id}">${esc(site.name)}</button></div>`;
      for (const label of hourLabels) {
        const hour = (days[date] || []).find(hour => hour.hourOfDay === label);
        cells += hour ? hourBlock(site, hour, { compact: true }) : "<div></div>";
      }
    }

    const columns = `minmax(76px, 140px) repeat(${hourLabels.length}, 1fr)`;
    return `<div class="heatmap-day">
      <h3>${dayLabel(date)} <small class="muted">wind in ${unit().label}</small></h3>
      <div class="heatmap" style="grid-template-columns: ${columns}">${cells}</div>
    </div>`;
  }).join("");
}
