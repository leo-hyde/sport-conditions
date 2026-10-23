// Saving and loading sites and settings in the browser ("localStorage").
// Browser storage can be switched off (e.g. in private browsing), so every
// read and write is wrapped in try/catch and falls back to the defaults.

const DEFAULT_SETTINGS = {
  speedGood: { min: 14, max: 16 },  // in the chosen unit
  speedOk:   { min: 12, max: 18 },
  units: "mph",  // wind speed unit: "mph", "kmh", "knots" or "ms" (see units.js)
  rainCutoff: 1,  // mm per hour; this much or more rates the hour "no"
  daylight: "sun",  // "sun" = sunrise to sunset; "twilight" = first to last light
  extraMinutes: 0,  // added before the start and after the end of the day
};

function loadSaved(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable: changes last until the page is closed.
  }
}

function loadSettings() {
  return { ...DEFAULT_SETTINGS, ...loadSaved("sc.settings", {}) };
}

function saveSettings(settings) {
  save("sc.settings", settings);
  queueSync();  // send to your other devices, if sync is on (sync.js)
}

// The first time, there are no saved sites, so we start with the starter list.
function loadSites() {
  const saved = loadSaved("sc.sites", null);
  if (!saved) return starterSites();

  // Older saved sites are missing newer details, so fill them in from the
  // site guide (matching names, ignoring spaces).
  const simple = name => name.toLowerCase().replace(/\s/g, "");
  for (const site of saved) {
    if (!site.sport) site.sport = "parakiting";  // sites saved before sports existed
    const match = SITE_LIBRARY.find(lib => simple(lib.name) === simple(site.name));
    if (site.beach === undefined) site.beach = Boolean(match && match.beach);  // before "beach" replaced "coastal"
    if (site.custom === undefined) site.custom = !match;  // not in the guide, so you made it
    delete site.coastal;
    // Before tide rules, sites could only be marked "not near high tide",
    // with the hours set in Settings.
    if (site.notHighTide) {
      site.tideRule = { mode: "avoid", water: "high", hours: loadSaved("sc.settings", {}).highTideWindow || 1.5 };
    }
    delete site.notHighTide;
  }
  return saved;
}

function saveSites(sites) {
  save("sc.sites", sites);
  queueSync();  // send to your other devices, if sync is on (sync.js)
}

// Copies of the starter sites, each given an id so we can edit them later.
function starterSites() {
  return STARTER_SITES.map(site => librarySiteCopy(site));
}

// A copy of a site from the library, ready to add to your own sites.
function librarySiteCopy(site) {
  return {
    id: makeId(),
    name: site.name,
    lat: site.lat,
    lon: site.lon,
    goodDirections: [...site.goodDirections],
    okDirections: [...site.okDirections],
    beach: Boolean(site.beach),
    custom: false,  // from the site guide, not made by you
    tideRule: site.tideRule || (site.notHighTide ? { mode: "avoid", water: "high", hours: 1.5 } : null),
    sport: "parakiting",
  };
}

// A short random id like "k3j9x0qa".
function makeId() {
  return Math.random().toString(36).slice(2, 10);
}
