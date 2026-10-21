// Show every site's hourly forecast as a strip of coloured blocks,
// with a summary of which sites look good today and tomorrow.

// Speed rules belong to the sport, so they apply to every paragliding site.
const PARAGLIDING = {
  speedGood: { min: 14, max: 16 },  // mph
  speedOk:   { min: 12, max: 18 },  // mph
};

// The sites come from sites.js, which is loaded before this file.
const sites = STARTER_SITES;

// The 16 compass points, in order clockwise from North.
const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                 "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

// Turn a direction in degrees (0–360) into a compass point, e.g. 290 → "WNW".
// Each compass point covers 22.5 degrees (360 / 16).
function degreesToCompass(degrees) {
  const index = Math.round(degrees / 22.5) % 16;
  return COMPASS[index];
}

// Build the Open-Meteo web address asking for the data we need.
function forecastUrl(site) {
  const params = new URLSearchParams({
    latitude: site.lat,
    longitude: site.lon,
    hourly: "wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation,is_day",
    wind_speed_unit: "mph",
    timezone: "Europe/London",
    forecast_days: 3,
  });
  return "https://api.open-meteo.com/v1/forecast?" + params;
}

// Open-Meteo sends each value as a separate list (all the times, all the
// speeds, …). This joins them into one object per hour, which is easier to use.
function toHours(data) {
  const h = data.hourly;
  return h.time.map((time, i) => ({
    date: time.slice(0, 10),  // "2026-10-21"
    hourOfDay: time.slice(11, 13),  // "14"
    speed: Math.round(h.wind_speed_10m[i]),
    gusts: Math.round(h.wind_gusts_10m[i]),
    degrees: h.wind_direction_10m[i],
    direction: degreesToCompass(h.wind_direction_10m[i]),
    rain: h.precipitation[i],
    isDaylight: h.is_day[i] === 1,
  }));
}

// Each check gives "good", "ok" or "no".
function rateDirection(direction, site) {
  if (site.goodDirections.includes(direction)) return "good";
  if (site.okDirections.includes(direction)) return "ok";
  return "no";
}

function rateSpeed(speed, sport) {
  if (speed >= sport.speedGood.min && speed <= sport.speedGood.max) return "good";
  if (speed >= sport.speedOk.min && speed <= sport.speedOk.max) return "ok";
  return "no";
}

function rateRain(rain) {
  return rain > 0 ? "no" : "good";
}

// The hour's overall rating is the worst of the three checks.
function rateHour(hour, site, sport) {
  const ratings = [
    rateDirection(hour.direction, site),
    rateSpeed(hour.speed, sport),
    rateRain(hour.rain),
  ];
  if (ratings.includes("no")) return "no";
  if (ratings.includes("ok")) return "ok";
  return "good";
}

// Group a site's daylight hours by day: { "2026-10-21": [hour, hour, …], … }
function groupByDay(hours) {
  const days = {};
  for (const hour of hours.filter(hour => hour.isDaylight)) {
    if (!days[hour.date]) days[hour.date] = [];
    days[hour.date].push(hour);
  }
  return days;
}

// "Today", "Tomorrow", or e.g. "Fri 23".
function dayLabel(date, index) {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  return new Date(date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
}

// One coloured block for one hour. The arrow shows which way the wind blows,
// and hovering shows the numbers (tap-for-details comes in step 4).
function hourBlock(hour) {
  const details = `${hour.hourOfDay}:00 · ${hour.speed} mph (gusts ${hour.gusts}) from ${hour.direction} · rain ${hour.rain} mm`;
  return `<div class="hour ${hour.rating}" title="${details}">
    <span class="time">${hour.hourOfDay}</span>
    <span class="arrow" style="transform: rotate(${hour.degrees}deg)">↓</span>
    <span class="speed">${hour.speed}</span>
  </div>`;
}

// A card for one site: its name, then one strip of hours per day.
function siteCard(site) {
  let html = `<section class="site"><h2>${site.name}</h2>`;
  Object.entries(site.days).forEach(([date, hours], index) => {
    html += `<div class="day">
      <div class="day-label">${dayLabel(date, index)}</div>
      <div class="hours">${hours.map(hourBlock).join("")}</div>
    </div>`;
  });
  return html + "</section>";
}

// For today and tomorrow, list the sites that have any good hours.
function summary(sites) {
  let html = "";
  ["Today", "Tomorrow"].forEach((label, index) => {
    const goodSites = sites
      .map(site => {
        const hours = Object.values(site.days)[index] || [];
        const goodCount = hours.filter(hour => hour.rating === "good").length;
        return { name: site.name, goodCount };
      })
      .filter(site => site.goodCount > 0);

    const text = goodSites.length > 0
      ? "🟢 " + goodSites.map(site => `${site.name} (${site.goodCount}h)`).join(", ")
      : "No good hours anywhere";
    html += `<p><strong>${label}:</strong> ${text}</p>`;
  });
  document.getElementById("summary").innerHTML = html;
}

// Fetch every site's forecast at the same time, then show them all.
// "async" lets us wait for the internet without freezing the page.
async function main() {
  const status = document.getElementById("status");
  try {
    const results = await Promise.all(
      sites.map(site => fetch(forecastUrl(site)).then(response => response.json()))
    );

    // Rate every hour and attach the days to each site.
    sites.forEach((site, i) => {
      const hours = toHours(results[i]);
      hours.forEach(hour => hour.rating = rateHour(hour, site, PARAGLIDING));
      site.days = groupByDay(hours);
    });

    status.textContent = "Paragliding · daylight hours · wind in mph";
    summary(sites);
    document.getElementById("forecast").innerHTML = sites.map(siteCard).join("");
  } catch (error) {
    status.textContent = "Couldn't load the forecast: " + error.message;
  }
}

main();
