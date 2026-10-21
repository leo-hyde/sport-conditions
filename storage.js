// Saving and loading sites and settings in the browser ("localStorage").
// Browser storage can be switched off (e.g. in private browsing), so every
// read and write is wrapped in try/catch and falls back to the defaults.

const DEFAULT_SETTINGS = {
  speedGood: { min: 14, max: 16 },  // mph
  speedOk:   { min: 12, max: 18 },  // mph
  rainCutoff: 1,  // mm per hour; this much or more rates the hour "no"
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
  return loadSaved("sc.sites", null) || starterSites();
}

function saveSites(sites) {
  save("sc.sites", sites);
}

// Copies of the starter sites, each given an id so we can edit them later.
function starterSites() {
  return STARTER_SITES.map(site => ({ ...site, id: makeId() }));
}

// A short random id like "k3j9x0qa".
function makeId() {
  return Math.random().toString(36).slice(2, 10);
}
