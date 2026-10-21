// Everything to do with the weather: fetching forecasts and rating hours.

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
    key: time.slice(0, 13),  // "2026-10-21T14", unique for each hour
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

async function fetchForecast(site) {
  const response = await fetch(forecastUrl(site));
  if (!response.ok) throw new Error(`Forecast for ${site.name} failed (${response.status})`);
  return toHours(await response.json());
}

// The current hour in UK time, in the same form as hour.key, so we can
// tell which hours are in the past.
function londonNowKey() {
  // "sv-SE" (Swedish) formats dates as "2026-10-21 14:05:03", which is easy to slice.
  return new Date().toLocaleString("sv-SE", { timeZone: "Europe/London" }).slice(0, 13).replace(" ", "T");
}

// Each check returns a rating ("good", "ok" or "no") and a sentence
// explaining it, which the hour details panel shows.
function checkDirection(hour, site) {
  if (site.goodDirections.includes(hour.direction)) return { rating: "good", text: `${hour.direction} is a good direction here` };
  if (site.okDirections.includes(hour.direction)) return { rating: "ok", text: `${hour.direction} is only OK here` };
  return { rating: "no", text: `${hour.direction} doesn't work here` };
}

function checkSpeed(hour, settings) {
  const good = settings.speedGood;
  const ok = settings.speedOk;
  if (hour.speed >= good.min && hour.speed <= good.max) {
    return { rating: "good", text: `${hour.speed} mph is in the good range (${good.min}–${good.max})` };
  }
  if (hour.speed >= ok.min && hour.speed <= ok.max) {
    return { rating: "ok", text: `${hour.speed} mph is only OK (good is ${good.min}–${good.max})` };
  }
  if (hour.speed < ok.min) return { rating: "no", text: `${hour.speed} mph is too light (needs ${ok.min}+)` };
  return { rating: "no", text: `${hour.speed} mph is too strong (max ${ok.max})` };
}

function checkRain(hour, settings) {
  if (hour.rain >= settings.rainCutoff) {
    return { rating: "no", text: `${hour.rain} mm of rain (cutoff is ${settings.rainCutoff} mm)` };
  }
  if (hour.rain > 0) return { rating: "good", text: `Light rain, ${hour.rain} mm (under the cutoff)` };
  return { rating: "good", text: "Dry" };
}

function checkHour(hour, site, settings) {
  return [checkDirection(hour, site), checkSpeed(hour, settings), checkRain(hour, settings)];
}

// The overall rating is the worst of the individual ratings.
function worstRating(ratings) {
  if (ratings.includes("no")) return "no";
  if (ratings.includes("ok")) return "ok";
  return "good";
}

function rateHour(hour, site, settings) {
  return worstRating(checkHour(hour, site, settings).map(check => check.rating));
}
