// Reads Windy's forecast table for one place, for several models.
// Used by specs/forecast-validation.md: open
// https://www.windy.com/<lat>/<lon>/ukv in the built-in browser, then run this
// whole file in the page (javascript_tool). It returns JSON to save as one
// site's entry for tools/windy_compare.py.
// Windy's table is in knots, every 3 hours, in the browser's local time.
(async () => {
  const MODELS = ["UKV", "ECMWF", "ICON-EU", "AROME-HD", "GFS"];
  const sleep = ms => new Promise(done => setTimeout(done, ms));
  const row = name => [...document.querySelector(".tr--" + name).children].map(cell => cell.textContent.trim());
  // The model buttons under "Source:" (open that menu first if none are found).
  const button = name => [...document.querySelectorAll("*")].find(el =>
    el.children.length <= 1 && el.offsetParent &&
    el.textContent.trim().startsWith(name) && el.textContent.trim().length < name.length + 8);

  for (let tries = 0; !document.querySelector(".tr--wind") && tries < 20; tries++) await sleep(500);
  if (!button("UKV")) {  // open the "Source:" menu
    const source = [...document.querySelectorAll("*")].find(el => el.children.length <= 2 && /^Source:/.test(el.textContent.trim()));
    if (source) { source.click(); await sleep(1000); }
  }
  const result = { url: location.href, firstDay: row("days")[0].replace(/\s*\d+%.*/, ""), hours: null, wind: {}, gust: {} };
  for (const model of MODELS) {
    const el = button(model);
    if (!el) { result.wind[model] = null; continue; }
    el.click();
    await sleep(2500);  // Windy loads the new model's numbers
    result.hours = row("hour").map(Number);
    result.wind[model] = row("wind").map(Number);
    result.gust[model] = row("gust").map(Number);
  }
  return JSON.stringify(result);  // one line, ready to paste into the JSON file
})();
