// Tides: height through the day, high and low water, and springs or neaps.
//
// Best source: official UK tide times from the UK Hydrographic Office
// (Admiralty), through our Cloudflare Worker, from the nearest of 607 UK tide
// stations. If that isn't available (no key set up yet, or the site is far
// from a station), we fall back to Open-Meteo's marine model, which is coarse:
// it smooths out the tidal range, so its heights are rough.

const TIDES_URL = "https://sport-conditions-weather.leo-h-hyde.workers.dev/tides";
const MAX_STATION_KM = 25;  // use a station only if it's this close to the site
let tideStationList = null;  // fetched once: [{ id, name, lat, lon }, …]

async function fetchTides(site) {
  try {
    const official = await fetchAdmiraltyTides(site);
    if (official) return official;
  } catch {
    // Fall through to the model below.
  }
  return fetchModelTides(site);
}

// Distance between two places in km (the "haversine" formula).
function distanceKm(a, b) {
  const toRad = degrees => degrees * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

// "2026-10-21T13:55:00" in UTC (how the Admiralty sends times) → the same
// moment as a UK-time hour number, like hourNumber() below.
function ukHourNumber(utcTime) {
  const uk = new Date(utcTime.replace(/Z?$/, "Z"))
    .toLocaleString("sv-SE", { timeZone: "Europe/London" });  // "2026-10-21 14:55:00"
  return Date.parse(uk.replace(" ", "T") + "Z") / 3600000;
}

async function fetchAdmiraltyTides(site) {
  if (!tideStationList) tideStationList = await fetchJson(`${TIDES_URL}/stations`);
  const nearest = tideStationList
    .map(station => ({ ...station, km: distanceKm(site, station) }))
    .sort((a, b) => a.km - b.km)[0];
  if (!nearest || nearest.km > MAX_STATION_KM) return null;

  const events = await fetchJson(`${TIDES_URL}/events?station=${nearest.id}`);
  const turns = events
    .filter(event => event.EventType === "HighWater" || event.EventType === "LowWater")
    .map(event => {
      const at = ukHourNumber(event.DateTime);
      return {
        type: event.EventType === "HighWater" ? "high" : "low",
        at,
        date: new Date(at * 3600000).toISOString().slice(0, 10),
        hours: (at % 24 + 24) % 24,
        height: event.Height,
      };
    })
    .sort((a, b) => a.at - b.at);
  if (turns.length < 2) return null;

  // Heights between high and low water follow a smooth "cosine" curve, the
  // standard way to estimate the tide between the published times.
  const byHour = {};
  for (let i = 0; i < turns.length - 1; i++) {
    const [from, to] = [turns[i], turns[i + 1]];
    for (let hour = Math.ceil(from.at); hour < to.at; hour++) {
      const fraction = (hour - from.at) / (to.at - from.at);
      const height = from.height + (to.height - from.height) * (1 - Math.cos(Math.PI * fraction)) / 2;
      byHour[new Date(hour * 3600000).toISOString().slice(0, 13)] = height;
    }
  }
  return { byHour, turns, source: `Admiralty, ${nearest.name}`, approximate: false };
}

function tidesUrl(site) {
  const params = new URLSearchParams({
    latitude: site.lat,
    longitude: site.lon,
    hourly: "sea_level_height_msl",
    timezone: "Europe/London",
    forecast_days: 7,
  });
  return "https://marine-api.open-meteo.com/v1/marine?" + params;
}

// Hours since 1970, treating UK times as if they were UTC. That's fine
// because we only ever compare these numbers with each other.
const hourNumber = key => Date.parse(key.slice(0, 13) + ":00:00Z") / 3600000;

async function fetchModelTides(site) {
  const { time, sea_level_height_msl: heights } = (await fetchJson(tidesUrl(site))).hourly;

  const byHour = {};  // hour key → height in metres
  time.forEach((t, i) => { byHour[t.slice(0, 13)] = heights[i]; });

  // High and low water are where the height stops rising (or falling).
  // Fitting a curve through the 3 hours around the turn gives the time
  // to the nearest few minutes.
  const turns = [];
  for (let i = 1; i < heights.length - 1; i++) {
    const [before, now, after] = [heights[i - 1], heights[i], heights[i + 1]];
    if (before === null || now === null || after === null) continue;
    const isHigh = now >= before && now > after;
    const isLow = now <= before && now < after;
    if (!isHigh && !isLow) continue;
    const offset = (before - after) / (2 * (before - 2 * now + after));
    const at = hourNumber(time[i]) + offset;
    turns.push({
      type: isHigh ? "high" : "low",
      at,
      date: new Date(at * 3600000).toISOString().slice(0, 10),
      hours: (at % 24 + 24) % 24,
      height: now,
    });
  }
  return { byHour, turns, source: "Open-Meteo model", approximate: true };
}

// The tide at one hour: its height and whether it's rising.
function tideAt(tides, key) {
  const height = tides.byHour[key];
  const next = tides.byHour[new Date((hourNumber(key) + 1) * 3600000).toISOString().slice(0, 13)];
  if (height === undefined || height === null) return null;
  return { height, rising: next !== undefined ? next > height : null };
}

// The high or low water (type "high" or "low"), if any, within
// `windowHours` of this hour.
function nearbyTurn(tides, key, type, windowHours) {
  const at = hourNumber(key);
  return tides.turns.find(turn => turn.type === type && Math.abs(turn.at - at) <= windowHours);
}

// A site's tide rule says when it works, e.g. { mode: "avoid", water: "low",
// hours: 2 } is "not within 2 hours of low water"; mode "only" means only then.
// Sites without one work at any tide.
function tideRuleText(rule) {
  if (!rule) return "";
  return `${rule.mode === "avoid" ? "Not" : "Only"} within ${rule.hours}h of ${rule.water} water`;
}

// The stretches of a day (in hours, 0–24) a tide rule rules out.
function tideNoGo(rule, turns) {
  const near = turns.filter(turn => turn.type === rule.water)
    .map(turn => [Math.max(turn.hours - rule.hours, 0), Math.min(turn.hours + rule.hours, 24)]);
  if (rule.mode === "avoid") return near;
  // "Only": everything between the allowed stretches.
  const gaps = [];
  let from = 0;
  for (const [start, end] of near.sort((a, b) => a[0] - b[0])) {
    if (start > from) gaps.push([from, start]);
    from = Math.max(from, end);
  }
  if (from < 24) gaps.push([from, 24]);
  return gaps;
}

// Spring tides come 1–2 days after a new or full moon, and neaps about a
// week later, so we can work them out from the moon's age.
function tideRange(date) {
  const LUNAR_MONTH = 29.530588853;  // days from one new moon to the next
  const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
  const days = (Date.parse(date + "T12:00:00Z") - KNOWN_NEW_MOON) / DAY_MS;
  const halfMonth = LUNAR_MONTH / 2;
  // 0 = springs, 0.5 = neaps, back to 1 = springs again.
  const phase = (((days - 1.5) % halfMonth) + halfMonth) % halfMonth / halfMonth;
  const springness = Math.cos(phase * 2 * Math.PI);  // 1 = springs, −1 = neaps

  if (springness > 0.6) return "Springs";
  if (springness < -0.6) return "Neaps";
  return phase < 0.5 ? "Mid (shrinking)" : "Mid (growing)";
}
