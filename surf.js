// Surfing: the surf settings, wave forecasts, and rating a surf hour.
// Waves come from Open-Meteo's free marine forecast. Surfline has no public
// API (and its terms forbid copying its forecasts), so we link to it instead.

// Surf settings: wave sizes in feet, like Surfline; wind speeds in the
// chosen unit, like parakiting.
const SURF_DEFAULTS = {
  units: "mph",
  waveGood: { min: 3, max: 6 },  // feet
  waveOk: { min: 2, max: 8 },
  periodGood: 10,  // seconds between waves, or more
  periodOk: 7,
  windLight: 6,  // any direction up to this is fine (glassy)
  windOk: 12,  // onshore or cross-shore up to this is OK
  offshoreMax: 25,  // offshore up to this is good
  daylight: "sun",
  extraMinutes: 0,
};

// ---------- Wave forecasts ----------

const FEET_PER_METRE = 3.281;
const WAVE_POINT_KM = 2.5;

// The forecast comes from a point about 2.5 km out to sea from the spot (in
// the direction of its good swells), so it's always from a sea grid cell:
// a point on the beach itself can land on a land cell, which has no waves.
function wavePoint(spot) {
  // The average of the good swell directions (as arrows, so N and NNW
  // average to "north-ish", not "south").
  let x = 0;
  let y = 0;
  for (const point of spot.goodDirections) {
    const radians = COMPASS.indexOf(point) * 22.5 * Math.PI / 180;
    x += Math.sin(radians);
    y += Math.cos(radians);
  }
  const bearing = Math.atan2(x, y);
  const km = x === 0 && y === 0 ? 0 : WAVE_POINT_KM;
  return {
    lat: spot.lat + km / 111 * Math.cos(bearing),
    lon: spot.lon + km / (111 * Math.cos(spot.lat * Math.PI / 180)) * Math.sin(bearing),
  };
}

function wavesUrl(spot) {
  const point = wavePoint(spot);
  const params = new URLSearchParams({
    latitude: point.lat.toFixed(4),
    longitude: point.lon.toFixed(4),
    hourly: "wave_height,wave_period,wave_direction,swell_wave_period,swell_wave_direction",
    timezone: "Europe/London",
    forecast_days: FORECAST_DAYS,
  });
  return "https://marine-api.open-meteo.com/v1/marine?" + params;
}

// { hour key → { feet, period, degrees, direction } }. Height is all the
// waves (swell and wind chop); period and direction are the swell's, which
// is what makes surf good, falling back to all the waves' if there's no swell.
async function fetchWaves(spot) {
  const h = (await fetchJson(wavesUrl(spot))).hourly;
  const waves = {};
  h.time.forEach((time, i) => {
    if (h.wave_height[i] === null) return;
    const degrees = h.swell_wave_direction[i] ?? h.wave_direction[i];
    waves[time.slice(0, 13)] = {
      feet: h.wave_height[i] * FEET_PER_METRE,
      period: Math.round(h.swell_wave_period[i] ?? h.wave_period[i]),
      degrees,
      direction: degreesToCompass(degrees),
    };
  });
  return waves;
}

// A surf spot's hour, with that hour's waves added (if we have them).
function withWaves(site, hour) {
  if (site.sport !== "surfing") return hour;
  return { ...hour, wave: (state.waves[site.id] || {})[hour.key] };
}

// ---------- Describing waves ----------

// "2.5": to the nearest half foot.
function feetText(feet) {
  return String(Math.round(feet * 2) / 2);
}

// The way surfers (and Surfline) describe wave size.
function sizeWords(feet) {
  if (feet < 1) return "flat";
  if (feet < 2) return "ankle to knee";
  if (feet < 3) return "knee to waist";
  if (feet < 4) return "waist to chest";
  if (feet < 5) return "chest to head";
  if (feet < 6.5) return "head high";
  if (feet < 9) return "over head height";
  return "well over head height";
}

// Only real Surfline page addresses are used as links (so a typed or synced
// address can't be something harmful, like a "javascript:" link).
function isSurflineUrl(text) {
  return /^https:\/\/(www\.)?surfline\.com\//.test(text || "");
}

// The spot's Surfline page if we have its address; otherwise a search for it.
function surflineUrl(site) {
  return isSurflineUrl(site.surfline)
    ? site.surfline
    : "https://www.google.com/search?q=" + encodeURIComponent(`Surfline ${site.name} surf report`);
}

// ---------- Rating a surf hour ----------

function checkWaveSize(wave, settings) {
  const feet = Number(feetText(wave.feet));
  const good = settings.waveGood;
  const ok = settings.waveOk;
  const text = `${feet} ft (${sizeWords(wave.feet)})`;
  if (feet >= good.min && feet <= good.max) return { rating: "good", text: `${text}: a good size (${good.min}–${good.max} ft)` };
  if (feet >= ok.min && feet <= ok.max) return { rating: "ok", text: `${text}: OK (good is ${good.min}–${good.max} ft)` };
  if (feet < ok.min) return { rating: "no", text: `${text}: too small (needs ${ok.min} ft+)` };
  return { rating: "no", text: `${text}: too big (max ${ok.max} ft)` };
}

function checkPeriod(wave, settings) {
  if (wave.period >= settings.periodGood) return { rating: "good", text: `${wave.period} s between waves: clean, powerful swell` };
  if (wave.period >= settings.periodOk) return { rating: "ok", text: `${wave.period} s between waves: OK (good is ${settings.periodGood} s+)` };
  return { rating: "no", text: `${wave.period} s between waves: short and choppy (needs ${settings.periodOk} s+)` };
}

function checkSwellDirection(wave, site) {
  if (site.goodDirections.includes(wave.direction)) return { rating: "good", text: `Waves from ${wave.direction}: a good direction here` };
  if (site.okDirections.includes(wave.direction)) return { rating: "ok", text: `Waves from ${wave.direction}: only OK here` };
  return { rating: "no", text: `Waves from ${wave.direction}: they don't reach this spot well` };
}

// Offshore wind (blowing from the land out to sea) holds waves up and keeps
// them clean; onshore wind makes them messy. Very light wind is fine either way.
function checkSurfWind(hour, site, settings) {
  const speed = `${hour.speed} ${unit().label}`;
  if ((site.offshore || []).includes(hour.direction)) {
    if (hour.speed <= settings.offshoreMax) return { rating: "good", text: `Offshore wind (${hour.direction}, ${speed}): clean waves` };
    return { rating: "ok", text: `Strong offshore wind (${hour.direction}, ${speed}): hard to paddle into waves` };
  }
  if (hour.speed <= settings.windLight) return { rating: "good", text: `Light wind (${hour.direction}, ${speed}): smooth, glassy water` };
  if (hour.speed <= settings.windOk) return { rating: "ok", text: `Onshore or cross-shore wind (${hour.direction}, ${speed}): a bit choppy` };
  return { rating: "no", text: `Onshore or cross-shore wind (${hour.direction}, ${speed}): blown out` };
}

// Like checkHour (weather.js), for surf spots.
function checkSurfHour(hour, site, settings, tides) {
  if (!hour.wave) return [{ rating: "no", text: "No wave forecast for this hour" }];
  const checks = [
    checkWaveSize(hour.wave, settings),
    checkPeriod(hour.wave, settings),
    checkSwellDirection(hour.wave, site),
    checkSurfWind(hour, site, settings),
  ];
  const tide = checkTide(hour, site, settings, tides);
  return tide ? [...checks, tide] : checks;
}

// ---------- My surf spots ----------

// A copy of a guide spot, ready to add to your sites.
function surfSiteCopy(spot) {
  return {
    id: makeId(),
    name: spot.name,
    lat: spot.lat,
    lon: spot.lon,
    goodDirections: [...spot.goodDirections],  // swell directions
    okDirections: [...spot.okDirections],
    offshore: [...spot.offshore],
    tideRule: spot.tideRule ? { ...spot.tideRule } : null,
    surfline: spot.surfline,
    beach: true,
    custom: false,
    sport: "surfing",
  };
}

// The first time you choose surfing (or if you've removed every surf spot),
// you start with the Newquay spots.
function addSurfStartersIfNone() {
  if (state.sites.some(site => site.sport === "surfing")) return;
  state.sites.push(...SURF_STARTERS.map(surfSiteCopy));
  saveSites(state.sites);
}
