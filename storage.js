// Saving and loading sites and settings in the browser ("localStorage").
// Browser storage can be switched off (e.g. in private browsing), so every
// read and write is wrapped in try/catch and falls back to the defaults.

const DEFAULT_SETTINGS = {
  speedGood: { min: 14, max: 16 },  // mph
  speedOk:   { min: 12, max: 18 },  // mph
  rainCutoff: 1,  // mm per hour; this much or more rates the hour "no"
  daylight: "sun",  // "sun" = sunrise to sunset; "twilight" = first to last light
  extraMinutes: 0,  // added before the start and after the end of the day
  highTideWindow: 1.5,  // hours either side of high water, for tide-sensitive sites
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
}

// The first time, there are no saved sites, so we start with the starter list.
function loadSites() {
  const saved = loadSaved("sc.sites", null);
  if (!saved) return starterSites();

  // Sites saved before tides existed don't know if they're coastal, so
  // copy that from the site library (matching names, ignoring spaces).
  const simple = name => name.toLowerCase().replace(/\s/g, "");
  for (const site of saved) {
    if (site.coastal !== undefined) continue;
    const match = SITE_LIBRARY.find(lib => simple(lib.name) === simple(site.name));
    site.coastal = Boolean(match && match.coastal);
  }
  return saved;
}

function saveSites(sites) {
  save("sc.sites", sites);
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
    coastal: Boolean(site.coastal),
    notHighTide: Boolean(site.notHighTide),
  };
}

// A short random id like "k3j9x0qa".
function makeId() {
  return Math.random().toString(36).slice(2, 10);
}
