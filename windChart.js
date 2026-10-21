// A chart of an airport's live wind over the last 24 hours, opened from the
// live wind labels on the map. The data comes through our Cloudflare Worker.

const CHART = { width: 640, height: 250, left: 34, right: 12, top: 10, bottom: 50 };

async function showStationHistory(id) {
  const name = stationNames[id] || id;
  const dialog = document.getElementById("station-dialog");
  const body = dialog.querySelector(".dialog-content");
  const heading = `<div><h2>${esc(name)}</h2><p class="muted">Live wind, last 24 hours · ${id}</p></div>`;
  body.innerHTML = heading + '<p class="hint">Loading…</p>';
  if (!dialog.open) dialog.showModal();

  let reports;
  try {
    reports = await fetchJson(`${STATIONS_URL}?ids=${id}&hours=24`);
  } catch {
    body.innerHTML = heading + '<p class="error">Couldn\'t load the history. The Cloudflare Worker may need updating with the latest code.</p>';
    return;
  }

  // Oldest first. Knots become the chosen unit; "VRB" (variable) directions have no arrow.
  const points = reports
    .filter(report => typeof report.wspd === "number")
    .map(report => ({
      time: report.obsTime,
      speed: fromKnots(report.wspd),
      gust: report.wgst ? fromKnots(report.wgst) : null,
      degrees: typeof report.wdir === "number" ? report.wdir : null,
    }))
    .sort((a, b) => a.time - b.time);

  if (points.length < 2) {
    body.innerHTML = heading + '<p class="muted">Not enough reports to draw a chart.</p>';
    return;
  }

  const rows = [...points].reverse().map(point => `<tr>
    <td>${clockTime(point.time)}</td>
    <td><strong>${point.speed}</strong> ${unit().label}</td>
    <td>${point.gust ? `${point.gust} gust` : ""}</td>
    <td>${point.degrees === null ? "VRB" : `${arrow(point.degrees)} ${degreesToCompass(point.degrees)}`}</td>
  </tr>`).join("");

  body.innerHTML = `
    ${heading}
    <p id="chart-readout" class="chart-readout"></p>
    ${windChartSvg(points)}
    <div class="chart-legend">
      <span><i class="key-line"></i>Wind</span>
      <span><i class="key-dot"></i>Gusts</span>
      <span><i class="key-band good"></i>Good range</span>
      <span><i class="key-band ok"></i>OK range</span>
    </div>
    <details>
      <summary>Show as a table</summary>
      <table class="compare">${rows}</table>
    </details>
    <p class="links"><a href="https://aviationweather.gov/data/metar/?id=${id}&hours=24&decoded=yes"
      target="_blank" rel="noopener">Full reports on aviationweather.gov ↗</a></p>`;
  setupChartHover(points);
}

// "14:20" in UK time, from seconds since 1970.
function clockTime(seconds) {
  return new Date(seconds * 1000)
    .toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });
}

// Turns a time or a speed into a position on the chart.
function chartScales(points) {
  const { width, height, left, right, top, bottom } = CHART;
  const first = points[0].time;
  const last = points[points.length - 1].time;
  const highest = Math.max(...points.map(point => Math.max(point.speed, point.gust || 0)), state.settings.speedOk.max);
  const yMax = Math.ceil((highest + 2) / 10) * 10;  // round up to the next 10
  return {
    yMax,
    x: time => left + (time - first) / (last - first) * (width - left - right),
    y: speed => top + (1 - speed / yMax) * (height - top - bottom),
  };
}

function windChartSvg(points) {
  const { width, height, left, right, top, bottom } = CHART;
  const { x, y, yMax } = chartScales(points);
  const plotRight = width - right;
  const plotBottom = height - bottom;
  const good = state.settings.speedGood;
  const ok = state.settings.speedOk;

  // Shaded bands for your OK and good speed ranges, behind everything else.
  const band = (range, className) =>
    `<rect class="band ${className}" x="${left}" width="${plotRight - left}" y="${y(range.max)}" height="${y(range.min) - y(range.max)}"/>`;

  // Light grid lines and labels every 10 (mph, km/h, …).
  let grid = "";
  for (let speed = 0; speed <= yMax; speed += 10) {
    grid += `<line class="grid" x1="${left}" x2="${plotRight}" y1="${y(speed)}" y2="${y(speed)}"/>
      <text class="axis" x="${left - 6}" y="${y(speed)}" text-anchor="end" dominant-baseline="central">${speed}</text>`;
  }

  // Time labels every 3 hours, on the hour.
  let times = "";
  const threeHours = 3 * 3600;
  for (let t = Math.ceil(points[0].time / threeHours) * threeHours; t <= points[points.length - 1].time; t += threeHours) {
    times += `<text class="axis" x="${x(t)}" y="${height - 6}" text-anchor="middle">${clockTime(t)}</text>`;
  }

  // A direction arrow about every 2 hours (reports come every 30 minutes).
  const arrows = points.filter((point, i) => i % 4 === 0 && point.degrees !== null).map(point =>
    `<text class="dir-arrow" transform="translate(${x(point.time)} ${plotBottom + 18}) rotate(${point.degrees})"
      text-anchor="middle" dominant-baseline="central">↓</text>`).join("");

  const line = points.map((point, i) => `${i === 0 ? "M" : "L"}${x(point.time)},${y(point.speed)}`).join(" ");
  const gusts = points.filter(point => point.gust).map(point =>
    `<circle class="gust" cx="${x(point.time)}" cy="${y(point.gust)}" r="4"/>`).join("");

  return `<svg class="wind-chart" viewBox="0 0 ${width} ${height}" role="img"
      aria-label="Wind speed over the last 24 hours. A table version is below.">
    ${band(ok, "ok")}${band(good, "good")}
    ${grid}
    <text class="axis" x="${left - 6}" y="${top - 2}" text-anchor="end">${unit().label}</text>
    <path class="speed-line" d="${line}"/>
    ${gusts}
    ${arrows}
    ${times}
    <line id="chart-cross" class="crosshair" x1="0" x2="0" y1="${top}" y2="${plotBottom}"/>
    <rect class="hit-area" x="${left}" y="${top}" width="${plotRight - left}" height="${plotBottom - top}"/>
  </svg>`;
}

// Moving a finger or the mouse over the chart shows that report's numbers
// above it, with a line marking the time. It starts on the latest report.
function setupChartHover(points) {
  const svg = document.querySelector(".wind-chart");
  const cross = document.getElementById("chart-cross");
  const readout = document.getElementById("chart-readout");
  const { x } = chartScales(points);

  const show = point => {
    cross.setAttribute("x1", x(point.time));
    cross.setAttribute("x2", x(point.time));
    const direction = point.degrees === null ? "variable" : `from ${degreesToCompass(point.degrees)}`;
    readout.innerHTML = `<strong>${clockTime(point.time)}</strong> · ${point.speed} ${unit().label}${point.gust ? `, gusting ${point.gust}` : ""} · ${direction}`;
  };

  svg.addEventListener("pointermove", event => {
    const box = svg.getBoundingClientRect();
    const chartX = (event.clientX - box.left) / box.width * CHART.width;
    const nearest = points.reduce((best, point) =>
      Math.abs(x(point.time) - chartX) < Math.abs(x(best.time) - chartX) ? point : best);
    show(nearest);
  });
  show(points[points.length - 1]);
}

document.addEventListener("click", event => {
  const button = event.target.closest("[data-station-history]");
  if (button) showStationHistory(button.dataset.stationHistory);
});
