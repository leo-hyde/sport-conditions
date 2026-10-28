// The design check: opens every screen with MADE-UP data (so it never uses up
// the forecast service's daily limit) and checks the rules in DESIGN.md
// "Rules every screen must pass". Run it before pushing any visual change:
//
//   node tools/ux-check.js            every screen, both sports, light and dark, phone and desktop
//   node tools/ux-check.js --quick    Parakiting and Surfing on a light phone only
//
// It checks: accessibility (axe-core, a standard checker: contrast, names,
// labels), tap sizes, keyboard focus rings, nothing wider than the screen,
// page errors, the feedback buttons not covering anything you need, and that
// failed forecasts and an empty site list say so. Ends with PASS or FAIL.
// Needs Node.js and Playwright (Claude's cloud sessions have both).

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { serve, findPlaywright, useFakeData } = require("./preview.js");

const CACHE = path.join(__dirname, ".cache");
const AXE_VERSION = "4.10.2";
const quick = process.argv.includes("--quick");

// Taps smaller than 44px tall are allowed only here (DESIGN.md "Tap sizes").
// Everything must still be at least 24 × 24px (WCAG 2.2's minimum), except
// the Overview "By hour" cells and links inside a sentence or the map credits.
const DENSE = [".tide-line", ".tag.link", ".tl-label", ".station-pin",
  "input[type=checkbox]", ".leaflet-marker-icon", ".marker-cluster"];
const TINY_OK = [".heatmap .hour", ".leaflet-control-attribution a", "p a", ".hint a"];

function axeSource() {
  const file = path.join(CACHE, `axe-core-${AXE_VERSION}`, "package", "axe.min.js");
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(path.dirname(file)), { recursive: true });
    execSync(`npm pack axe-core@${AXE_VERSION} --silent --pack-destination "${CACHE}"`, { stdio: "ignore" });
    execSync(`tar -xzf "${path.join(CACHE, `axe-core-${AXE_VERSION}.tgz`)}" -C "${path.dirname(path.dirname(file))}"`);
  }
  return fs.readFileSync(file, "utf8");
}

// Runs in the page: everything wrong with what's on screen now.
async function pageProblems({ phone, DENSE, TINY_OK }) {
  const problems = [];
  const result = await axe.run(document, { resultTypes: ["violations"] });
  for (const v of result.violations) {
    problems.push(`${v.impact}: ${v.help} (${v.nodes.length}×, e.g. ${v.nodes[0].target.join(" ")})`);
  }
  if (document.documentElement.scrollWidth > innerWidth) problems.push("the page is wider than the screen");

  const open = document.querySelector("dialog[open]");
  const tappable = [...document.querySelectorAll("button, a[href], input, select, summary, textarea, [role=button], [tabindex='0']")]
    .filter(el => {
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height || getComputedStyle(el).visibility === "hidden") return false;
      return open ? el.closest("dialog[open]") === open : !el.closest("dialog");
    });
  const small = {};
  for (const el of tappable) {
    if (TINY_OK.some(sel => el.matches(sel))) continue;
    const box = el.getBoundingClientRect();
    const name = el.tagName.toLowerCase() + (el.id ? "#" + el.id : el.classList[0] ? "." + el.classList[0] : "");
    // A checkbox counts as big if the row around it (its label) is.
    const target = el.matches("input[type=checkbox]") && el.closest("label") ? el.closest("label").getBoundingClientRect() : box;
    if (target.width < 24 || target.height < 24) small[`${name} is ${Math.round(target.width)}×${Math.round(target.height)}px (under 24px)`] = 1;
    else if (phone && target.height < 44 && !DENSE.some(sel => el.matches(sel))) small[`${name} is ${Math.round(target.height)}px tall (under 44px on phones)`] = 1;
  }
  problems.push(...Object.keys(small));

  // The feedback buttons must not cover anything you'd tap (at the bottom of
  // the page or panel, where everything can be scrolled clear of them).
  const fabs = document.getElementById("feedback-fabs");
  if (fabs && fabs.offsetParent) {
    const scroller = open || document.scrollingElement;
    scroller.scrollTop = scroller.scrollHeight;
    await new Promise(resolve => setTimeout(resolve, 900));  // the buttons fade back in
    const cover = fabs.getBoundingClientRect();
    const covered = tappable.filter(el => !fabs.contains(el) && !el.closest(".leaflet-container")).filter(el => {
      const box = el.getBoundingClientRect();
      return box.left < cover.right && cover.left < box.right && box.top < cover.bottom && cover.top < box.bottom;
    });
    if (covered.length) problems.push(`the feedback buttons cover: ${covered.slice(0, 3).map(el => el.textContent.trim().slice(0, 20) || el.getAttribute("aria-label")).join(", ")}`);
    scroller.scrollTop = 0;
  }
  return problems;
}

async function checkOne(browser, axe, { sport, dark, width }) {
  const phone = width < 600;
  const label = `${sport}, ${phone ? "phone" : "desktop"}, ${dark ? "dark" : "light"}`;
  const found = [];
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/index.html`;

  async function openPage(storage, fail) {
    const page = await browser.newPage({ viewport: { width, height: 760 }, colorScheme: dark ? "dark" : "light", hasTouch: phone });
    page.on("pageerror", error => found.push(`page error: ${error.message}`));
    await useFakeData(page);
    // Added after the made-up data, so it wins (Playwright tries the newest route first).
    if (fail) await page.route("**/*open-meteo.com/**", route => route.fulfill({ status: 500, body: "{}" }));
    await page.addInitScript(values => {
      if (sessionStorage.getItem("set")) return;
      sessionStorage.setItem("set", "1");
      for (const [key, value] of Object.entries(values)) localStorage.setItem(key, JSON.stringify(value));
    }, { "sc.sport": sport, "sc.view": "overview", "sc.layout": "days", ...storage });
    await page.goto(base);
    await page.waitForTimeout(1500);
    return page;
  }
  async function check(page, screen, steps = async () => {}) {
    await steps();
    await page.waitForTimeout(400);
    await page.addScriptTag({ content: axe });
    for (const problem of await page.evaluate(pageProblems, { phone, DENSE, TINY_OK })) found.push(`${screen}: ${problem}`);
  }
  const tap = (page, selector) => page.evaluate(sel => document.querySelector(sel).click(), selector);
  const closeDialogs = page => page.evaluate(() => document.querySelectorAll("dialog[open]").forEach(d => d.close()));

  // Every screen, in feedback mode so the floating buttons are checked too.
  const page = await openPage({ "sc.feedback": true });
  await check(page, "Overview by day");
  await check(page, "Overview by hour", () => tap(page, '#overview-switch [data-layout="hours"]'));
  await check(page, "My sites", () => tap(page, '#tabs [data-view="sites"]'));
  await check(page, "Hour details", () => tap(page, "#site-cards .hour"));
  await closeDialogs(page);
  if (await page.$("#site-cards button.tide-line")) {
    await check(page, "Tides", () => tap(page, "#site-cards button.tide-line"));
    await closeDialogs(page);
  }
  await check(page, "Settings", () => tap(page, "#open-settings"));
  await closeDialogs(page);
  await check(page, "Add site", () => tap(page, "#add-site"));
  await closeDialogs(page);
  await check(page, "Your requests", () => tap(page, "#feedback-open"));
  await closeDialogs(page);
  await check(page, "Map", async () => { await tap(page, '#tabs [data-view="map"]'); await page.waitForTimeout(1500); });

  // Keyboard: every stop shows a focus ring.
  await tap(page, '#tabs [data-view="sites"]');
  const noRing = new Set();
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const missing = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const style = getComputedStyle(el);
      const ring = (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== "none";
      return ring ? null : el.tagName.toLowerCase() + (el.classList[0] ? "." + el.classList[0] : "");
    });
    if (missing) noRing.add(missing);
  }
  if (noRing.size) found.push(`Keyboard: no focus ring on ${[...noRing].join(", ")}`);
  await page.close();

  // Failed forecasts must say so, not look like bad weather.
  const failed = await openPage({}, true);
  const headline = await failed.evaluate(() => document.getElementById("next-good").textContent);
  if (!/No forecasts loaded/.test(headline)) found.push(`Failed forecasts: the headline says "${headline.trim().slice(0, 50)}"`);
  await failed.close();

  // An empty site list.
  const empty = await openPage({ "sc.sites": [] });
  await check(empty, "No sites");
  await empty.close();

  server.close();
  return { label, found };
}

(async () => {
  const { chromium } = findPlaywright();
  const browser = await chromium.launch(fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {});
  const axe = axeSource();
  const runs = [];
  for (const sport of ["parakiting", "surfing"]) {
    for (const dark of quick ? [false] : [false, true]) {
      for (const width of quick ? [375] : [375, 1100]) runs.push({ sport, dark, width });
    }
  }
  let total = 0;
  for (const run of runs) {
    const { label, found } = await checkOne(browser, axe, run);
    const unique = [...new Set(found)];
    total += unique.length;
    console.log(unique.length ? `\n✕ ${label}: ${unique.length} problem(s)\n  ${unique.join("\n  ")}` : `✓ ${label}`);
  }
  await browser.close();
  console.log(total ? `\nFAIL: ${total} problem(s). Fix them, or add a reasoned exception to DESIGN.md and this file.` : "\nPASS: every screen meets DESIGN.md's rules.");
  process.exit(total ? 1 : 0);
})();
