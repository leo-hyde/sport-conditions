// Syncing your sites and settings between devices (phone, laptop, …) through
// our Cloudflare Worker. Every device using the same private sync code shares
// one copy. The code is long and random, so nobody can guess it, but anyone
// you give it to can see and change your sites.

const SYNC_URL = "https://sport-conditions-weather.leo-h-hyde.workers.dev/sync";
let syncTimer = null;
let syncStatus = "";

function syncCode() {
  return loadSaved("sc.syncCode", null);
}

// A code like "kite-4f9c2a7e1b3d5f60" (16 random hex digits).
function newSyncCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return "kite-" + [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function syncLink(code) {
  return `${location.origin}${location.pathname}#sync=${code}`;
}

// Called whenever sites or settings are saved: send them a moment later
// (so several quick changes go in one go).
function queueSync() {
  if (!syncCode()) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(pushSync, 1500);
}

async function pushSync() {
  const code = syncCode();
  if (!code) return;
  const time = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  try {
    const response = await fetch(`${SYNC_URL}?code=${code}`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ sites: state.sites, settings: state.settings, savedAt: new Date().toISOString() }),
    });
    syncStatus = response.ok ? `Saved to sync at ${time}` : `Sync isn't working (${response.status})`;
  } catch {
    syncStatus = "Couldn't reach sync. Are you offline?";
  }
  renderSyncBox();
}

// Loads what's saved under the code into this device. Returns true if it
// changed anything. If nothing's saved yet, it uploads this device's sites.
async function pullSync() {
  const code = syncCode();
  if (!code) return false;
  try {
    const saved = await fetchJson(`${SYNC_URL}?code=${code}`);
    if (!saved) {
      await pushSync();
      return false;
    }
    state.sites = saved.sites;
    state.settings = { ...DEFAULT_SETTINGS, ...saved.settings };
    // Save on this device directly (not saveSites), so it doesn't send them straight back.
    save("sc.sites", state.sites);
    save("sc.settings", state.settings);
    syncStatus = "Up to date";
    return true;
  } catch {
    syncStatus = "Couldn't reach sync. Using this device's copy.";
    return false;
  }
}

async function useSyncCode(code) {
  code = code.trim().toLowerCase();
  if (!/^[a-z]+-[0-9a-f]{16}$/.test(code)) {
    syncStatus = "That doesn't look like a sync code.";
    renderSyncBox();
    return;
  }
  save("sc.syncCode", code);
  const changed = await pullSync();
  document.getElementById("settings-dialog").close();
  if (changed) showToast("Synced: your sites are loaded on this device");
  refresh();
}

// The "Sync between devices" part of the settings panel.
function renderSyncBox() {
  const box = document.getElementById("sync-box");
  const code = syncCode();
  if (!code) {
    box.innerHTML = `
      <p class="hint">Your sites are only saved on this device. Turn on sync to have the same
        sites and settings on your phone and computer.</p>
      <div class="dialog-actions start">
        <button type="button" class="btn primary small" data-sync="start">Turn on sync</button>
        <button type="button" class="btn small" data-sync="enter">I have a code</button>
      </div>
      <div id="sync-enter" class="row" hidden>
        <input id="sync-code-input" type="text" placeholder="kite-…" autocapitalize="off" autocomplete="off">
        <button type="button" class="btn small" data-sync="use">Use code</button>
      </div>
      <p class="hint">${esc(syncStatus)}</p>`;
    return;
  }
  box.innerHTML = `
    <p class="hint">Sync is on. To use it on another device, open this link there
      (e.g. send it to yourself), or enter the code in its settings:</p>
    <p><code class="sync-code">${code}</code></p>
    <div class="dialog-actions start">
      <button type="button" class="btn small primary" data-sync="copy-link">Copy link</button>
      <button type="button" class="btn small" data-sync="now">Sync now</button>
      <button type="button" class="btn small ghost danger" data-sync="off">Turn off here</button>
    </div>
    <p class="hint">${esc(syncStatus)}</p>`;
}

document.getElementById("sync-box").addEventListener("click", async event => {
  const action = event.target.closest("[data-sync]")?.dataset.sync;
  if (action === "start") {
    save("sc.syncCode", newSyncCode());
    await pushSync();
  }
  if (action === "enter") document.getElementById("sync-enter").hidden = false;
  if (action === "use") await useSyncCode(document.getElementById("sync-code-input").value);
  if (action === "copy-link") {
    try {
      await navigator.clipboard.writeText(syncLink(syncCode()));
      syncStatus = "Link copied. Send it to your other device.";
    } catch {
      syncStatus = `Copy this link: ${syncLink(syncCode())}`;
    }
  }
  if (action === "now") {
    if (await pullSync()) refresh();
  }
  if (action === "off") {
    save("sc.syncCode", null);
    syncStatus = "Sync is off on this device. Your sites stay here.";
  }
  renderSyncBox();
});

// Opening a sync link (…#sync=kite-…) offers to switch sync on with that code.
async function checkSyncLink() {
  const match = location.hash.match(/sync=([a-z]+-[0-9a-f]{16})/);
  if (!match) return;
  history.replaceState(null, "", location.pathname);  // tidy the address bar
  if (match[1] === syncCode()) return;
  if (confirm("Turn on sync with this link? This device's sites will be replaced by your synced sites.")) {
    save("sc.syncCode", match[1]);
  }
}
