// The tide view: tap a site's tide line to see the day's tide as a curve,
// with high and low water, "now", your flying hours and (for sites that don't
// work near high tide) the times to avoid.

const TIDE_CHART = { width: 640, height: 230, left: 36, right: 12, top: 26, bottom: 30 };

function showTideDetails(siteId, date) {
  const site = state.sites.find(site => site.id === siteId);
  const tides = state.tides[siteId];
  if (!site || !tides) return;

  // The days we have tides for, so ‹ › can step between them.
  const dates = [...new Set(Object.keys(tides.byHour).map(key => key.slice(0, 10)))].sort();
  const index = dates.indexOf(date);
  const turns = tides.turns.filter(turn => turn.date === date);
  const describe = turn => `${turn.type === "high" ? "High" : "Low"} water ${formatHours(turn.hours)} (${turn.height.toFixed(1)} m)`;
  const step = (other, label, text) => other
    ? `<button class="btn small" data-tide-site="${siteId}" data-tide-date="${other}" aria-label="${label}">${text}</button>`
    : `<button class="btn small" disabled aria-label="${label}">${text}</button>`;

  const dialog = document.getElementById("tide-dialog");
  dialog.querySelector(".dialog-content").innerHTML = `
    <div class="hour-steps">
      ${step(dates[index - 1], "Previous day", "‹ Day before")}
      ${step(dates[index + 1], "Next day", "Day after ›")}
    </div>
    <div>
      <h2>🌊 ${esc(site.name)} tides</h2>
      <p class="muted">${dayLabel(date)} · ${tideRange(date)} tides${tideRangeHint(date)}</p>
    </div>
    <p id="tide-readout" class="chart-readout"></p>
    ${tideChartSvg(site, tides, date)}
    <div class="chart-legend">
      <span><i class="key-line tide"></i>Tide height</span>
      <span><i class="key-band fly"></i>Your flying hours</span>
      ${site.notHighTide ? '<span><i class="key-band avoid"></i>Too near high tide</span>' : ""}
    </div>
    <ul class="tide-events">${turns.map(turn => `<li class="${turn.type}">${describe(turn)}</li>`).join("")}</ul>
    <p class="hint">Source: ${esc(tides.source)}${tides.approximate ? " (heights are rough)" : ""}</p>`;
  if (!dialog.open) dialog.showModal();
  setupTideHover(tides, date);
}

// A few words on what springs and neaps mean for the day.
function tideRangeHint(date) {
  const range = tideRange(date);
  if (range === "Springs") return " (biggest range: the highest highs)";
  if (range === "Neaps") return " (smallest range)";
  return "";
}

// The day's hourly heights: [{ hour: 0–23, height }] (missing hours left out).
function tideDayPoints(tides, date) {
  const points = [];
  for (let hour = 0; hour < 24; hour++) {
    const height = tides.byHour[`${date}T${String(hour).padStart(2, "0")}`];
    if (height !== undefined && height !== null) points.push({ hour, height });
  }
  return points;
}

function tideScales(points, turns) {
  const { width, height, left, right, top, bottom } = TIDE_CHART;
  const heights = [...points.map(p => p.height), ...turns.map(t => t.height)];
  const low = Math.floor(Math.min(...heights)) - 0.5;
  const high = Math.ceil(Math.max(...heights)) + 0.5;
  return {
    low, high,
    x: hours => left + hours / 24 * (width - left - right),
    y: metres => top + (1 - (metres - low) / (high - low)) * (height - top - bottom),
  };
}

function tideChartSvg(site, tides, date) {
  const { width, height, left, right, top, bottom } = TIDE_CHART;
  const points = tideDayPoints(tides, date);
  const turns = tides.turns.filter(turn => turn.date === date);
  if (points.length < 2) return '<p class="muted">No tide heights for this day.</p>';
  const { x, y, low, high } = tideScales(points, turns);
  const plotBottom = height - bottom;
  const plotRight = width - right;

  // Shaded flying hours, and the times to avoid near high water.
  const fly = flyingWindow(site, date, state.settings);
  let bands = `<rect class="band fly" x="${x(fly.start)}" width="${x(fly.end) - x(fly.start)}" y="${top}" height="${plotBottom - top}"/>`;
  if (site.notHighTide) {
    const buffer = state.settings.highTideWindow;
    for (const turn of turns.filter(turn => turn.type === "high")) {
      const from = Math.max(turn.hours - buffer, 0);
      const to = Math.min(turn.hours + buffer, 24);
      bands += `<rect class="band avoid" x="${x(from)}" width="${x(to) - x(from)}" y="${top}" height="${plotBottom - top}"/>`;
    }
  }

  // Light grid lines every metre, and times every 3 hours.
  let grid = "";
  for (let metres = Math.ceil(low); metres <= high; metres++) {
    grid += `<line class="grid" x1="${left}" x2="${plotRight}" y1="${y(metres)}" y2="${y(metres)}"/>
      <text class="axis" x="${left - 6}" y="${y(metres)}" text-anchor="end" dominant-baseline="central">${metres}</text>`;
  }
  for (let hour = 0; hour <= 24; hour += 3) {
    grid += `<text class="axis" x="${x(hour)}" y="${height - 8}" text-anchor="middle">${String(hour % 24).padStart(2, "0")}:00</text>`;
  }

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.hour)},${y(p.height)}`).join(" ");

  // High and low water: a dot and its time.
  const marks = turns.map(turn => `
    <circle class="turn ${turn.type}" cx="${x(turn.hours)}" cy="${y(turn.height)}" r="5"/>
    <text class="turn-label" x="${x(turn.hours)}" y="${y(turn.height) + (turn.type === "high" ? -10 : 18)}" text-anchor="middle">${turn.type === "high" ? "HW" : "LW"} ${formatHours(turn.hours)}</text>`).join("");

  // "Now", if this is today.
  let now = "";
  const nowKey = londonNowKey();
  if (nowKey.startsWith(date)) {
    const nowHours = Number(nowKey.slice(11)) + new Date().getMinutes() / 60;
    now = `<line class="now-line" x1="${x(nowHours)}" x2="${x(nowHours)}" y1="${top}" y2="${plotBottom}"/>
      <text class="now-label" x="${x(nowHours)}" y="${top - 8}" text-anchor="middle">now</text>`;
  }

  return `<svg class="wind-chart tide-chart" viewBox="0 0 ${width} ${height}" role="img"
      aria-label="Tide height through the day. High and low water times are listed below.">
    ${bands}${grid}
    <text class="axis" x="${left - 6}" y="${top - 8}" text-anchor="end">m</text>
    <path class="tide-line" d="${line}"/>
    ${marks}${now}
    <line id="tide-cross" class="crosshair" x1="0" x2="0" y1="${top}" y2="${plotBottom}"/>
    <rect class="hit-area" x="${left}" y="${top}" width="${plotRight - left}" height="${plotBottom - top}"/>
  </svg>`;
}

// Moving a finger along the curve shows the height and whether it's rising.
function setupTideHover(tides, date) {
  const svg = document.querySelector(".tide-chart");
  const readout = document.getElementById("tide-readout");
  if (!svg) return;
  const points = tideDayPoints(tides, date);
  const { x } = tideScales(points, tides.turns.filter(turn => turn.date === date));
  const cross = document.getElementById("tide-cross");

  const show = point => {
    cross.setAttribute("x1", x(point.hour));
    cross.setAttribute("x2", x(point.hour));
    const tide = tideAt(tides, `${date}T${String(point.hour).padStart(2, "0")}`);
    const direction = tide && tide.rising !== null ? (tide.rising ? "rising" : "falling") : "";
    readout.innerHTML = `<strong>${String(point.hour).padStart(2, "0")}:00</strong> · ${point.height.toFixed(1)} m ${direction}`;
  };

  svg.addEventListener("pointermove", event => {
    const box = svg.getBoundingClientRect();
    const chartX = (event.clientX - box.left) / box.width * TIDE_CHART.width;
    show(points.reduce((best, p) => Math.abs(x(p.hour) - chartX) < Math.abs(x(best.hour) - chartX) ? p : best));
  });
  // Start at the current hour if it's today, otherwise midday.
  const nowKey = londonNowKey();
  const startHour = nowKey.startsWith(date) ? Number(nowKey.slice(11)) : 12;
  show(points.reduce((best, p) => Math.abs(p.hour - startHour) < Math.abs(best.hour - startHour) ? p : best));
}

document.addEventListener("click", event => {
  const button = event.target.closest("[data-tide-date]");
  if (button) showTideDetails(button.dataset.tideSite, button.dataset.tideDate);
});

// What the tide is doing right now, e.g. "Rising · HW 17:10", for site cards.
function tideNow(tides) {
  const now = londonNowKey();
  const tide = tideAt(tides, now);
  const next = tides.turns.find(turn => turn.at > hourNumber(now) + new Date().getMinutes() / 60);
  if (!tide || !next) return "";
  return `${tide.rising ? "Rising" : "Falling"} · ${next.type === "high" ? "HW" : "LW"} ${formatHours(next.hours)}`;
}
