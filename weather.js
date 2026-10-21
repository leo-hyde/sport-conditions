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

// The forecast models you can switch between. They're the same ones
// Windy offers, all served free by Open-Meteo.
const MODELS = [
  { id: "ukmo_seamless", name: "Met Office", detail: "UKV 2 km for 2 days, then global 10 km" },
  { id: "ecmwf_ifs025", name: "ECMWF", detail: "European centre, 25 km" },
  { id: "icon_seamless", name: "ICON", detail: "German weather service (DWD), 2–13 km" },
  { id: "gfs_seamless", name: "GFS", detail: "US weather service (NOAA), 13–25 km" },
  { id: "meteofrance_seamless", name: "AROME", detail: "Météo-France, 1–25 km, about 4 days" },
];

const FORECAST_DAYS = 7;

// Build the Open-Meteo web address asking for the data we need.
function forecastUrl(site, model) {
  const params = new URLSearchParams({
    latitude: site.lat,
    longitude: site.lon,
    hourly: "wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation",
    wind_speed_unit: unit().openMeteo,  // the chosen unit (see units.js)
    timezone: "Europe/London",
    forecast_days: FORECAST_DAYS,
    models: model,
  });
  return "https://api.open-meteo.com/v1/forecast?" + params;
}

// Open-Meteo sends each value as a separate list (all the times, all the
// speeds, …). This joins them into one object per hour, which is easier to use.
// Some models stop after a few days; those empty hours are left out.
function toHours(data) {
  const h = data.hourly;
  return h.time
    .map((time, i) => ({
      key: time.slice(0, 13),  // "2026-10-21T14", unique for each hour
      date: time.slice(0, 10),  // "2026-10-21"
      hourOfDay: time.slice(11, 13),  // "14"
      speed: Math.round(h.wind_speed_10m[i]),
      gusts: Math.round(h.wind_gusts_10m[i]),
      degrees: h.wind_direction_10m[i],
      direction: degreesToCompass(h.wind_direction_10m[i]),
      rain: h.precipitation[i],
      missing: h.wind_speed_10m[i] === null,
    }))
    .filter(hour => !hour.missing);
}

// Forecasts are kept on this device for 30 minutes (they only update about
// hourly), so reloading the page doesn't fetch them all again. The free
// weather service has a daily limit per internet connection, and this keeps
// us well under it. The ↻ button sets skipSavedForecasts to fetch fresh ones.
const SAVED_FORECAST_MINUTES = 30;
let skipSavedForecasts = false;
let forecastLimitReached = false;  // set when the service says we've used today's allowance

// Fetches JSON from a web address. If the server says "too many requests"
// (status 429), it waits a moment and tries again, up to 3 times. For the
// weather service, it uses a recent saved copy if there is one, and if the
// service won't answer at all, an older saved copy rather than nothing.
async function fetchJson(url, attempts = 3) {
  const saveable = url.includes("open-meteo.com");
  const saved = saveable ? await savedJson(url) : null;
  if (saved && saved.fresh && !skipSavedForecasts) return saved.data;
  // Once the forecast service has said "limit reached", don't keep asking
  // (until you press ↻): use saved copies, or give up straight away.
  if (saveable && forecastLimitReached) {
    if (saved) return saved.data;
    throw new Error("Daily forecast limit reached");
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      // Open-Meteo explains refusals, e.g. "Daily API request limit exceeded".
      const reason = await response.json().then(body => body.reason).catch(() => "");
      if (/daily|hourly/i.test(reason)) {
        forecastLimitReached = true;  // waiting a few seconds won't help
      } else if (response.status === 429 && attempts > 1) {
        // "Slow down" (a per-minute limit): wait a moment and try again.
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchJson(url, attempts - 1);
      }
      throw new Error(reason || `Request failed (${response.status})`);
    }
    const data = await response.json();
    if (saveable) saveJson(url, data);
    return data;
  } catch (error) {
    if (saved) return saved.data;  // old, but better than nothing
    throw error;
  }
}

// The browser's "Cache Storage" keeps whole responses. It isn't available
// when the page is opened by double-clicking the file, so errors are ignored.
async function savedJson(url) {
  try {
    const hit = await (await caches.open("forecasts")).match(url);
    if (!hit) return null;
    const ageMinutes = (Date.now() - Number(hit.headers.get("x-saved-at"))) / 60000;
    return { data: await hit.json(), fresh: ageMinutes < SAVED_FORECAST_MINUTES };
  } catch {
    return null;
  }
}

async function saveJson(url, data) {
  try {
    const response = new Response(JSON.stringify(data), { headers: { "x-saved-at": String(Date.now()) } });
    await (await caches.open("forecasts")).put(url, response);
  } catch {
    // No cache available: fine, we just fetch next time.
  }
}

async function fetchForecast(site, model) {
  return toHours(await fetchJson(forecastUrl(site, model)));
}

// Forecasts for several places in one request (Open-Meteo accepts lists of
// latitudes and longitudes). Returns a list of hours for each place, in order.
async function fetchForecasts(places, model) {
  const combined = {
    lat: places.map(place => place.lat).join(","),
    lon: places.map(place => place.lon).join(","),
  };
  const data = await fetchJson(forecastUrl(combined, model));
  return (Array.isArray(data) ? data : [data]).map(toHours);
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
    return { rating: "good", text: `${hour.speed} ${unit().label} is in the good range (${good.min}–${good.max})` };
  }
  if (hour.speed >= ok.min && hour.speed <= ok.max) {
    return { rating: "ok", text: `${hour.speed} ${unit().label} is only OK (good is ${good.min}–${good.max})` };
  }
  if (hour.speed < ok.min) return { rating: "no", text: `${hour.speed} ${unit().label} is too light (needs ${ok.min}+)` };
  return { rating: "no", text: `${hour.speed} ${unit().label} is too strong (max ${ok.max})` };
}

function checkRain(hour, settings) {
  if (hour.rain >= settings.rainCutoff) {
    return { rating: "no", text: `${hour.rain} mm of rain (cutoff is ${settings.rainCutoff} mm)` };
  }
  if (hour.rain > 0) return { rating: "good", text: `Light rain, ${hour.rain} mm (under the cutoff)` };
  return { rating: "good", text: "Dry" };
}

// Only for sites marked "doesn't work near high tide".
function checkTide(hour, site, settings, tides) {
  if (!site.notHighTide || !tides) return null;
  const high = nearbyHighWater(tides, hour.key, settings.highTideWindow);
  if (high) return { rating: "no", text: `Too close to high water (${formatHours(high.hours)})` };
  return { rating: "good", text: `Clear of high tide (more than ${settings.highTideWindow}h away)` };
}

// `tides` is optional: only beach sites have them.
function checkHour(hour, site, settings, tides) {
  const checks = [checkDirection(hour, site), checkSpeed(hour, settings), checkRain(hour, settings)];
  const tide = checkTide(hour, site, settings, tides);
  return tide ? [...checks, tide] : checks;
}

// The overall rating is the worst of the individual ratings.
function worstRating(ratings) {
  if (ratings.includes("no")) return "no";
  if (ratings.includes("ok")) return "ok";
  return "good";
}

function rateHour(hour, site, settings, tides) {
  return worstRating(checkHour(hour, site, settings, tides).map(check => check.rating));
}
