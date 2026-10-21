// Tides: height through the day, high and low water, and springs or neaps.
// Heights come from Open-Meteo's marine model. It's coarse (it smooths out
// the tidal range), so treat heights as rough; the times are more useful.

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

async function fetchTides(site) {
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
  return { byHour, turns };
}

// The tide at one hour: its height and whether it's rising.
function tideAt(tides, key) {
  const height = tides.byHour[key];
  const next = tides.byHour[new Date((hourNumber(key) + 1) * 3600000).toISOString().slice(0, 13)];
  if (height === undefined || height === null) return null;
  return { height, rising: next !== undefined ? next > height : null };
}

// The high water (if any) within `windowHours` of this hour.
function nearbyHighWater(tides, key, windowHours) {
  const at = hourNumber(key);
  return tides.turns.find(turn => turn.type === "high" && Math.abs(turn.at - at) <= windowHours);
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
