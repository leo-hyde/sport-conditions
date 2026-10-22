# Sport Conditions: Product Spec

Status: **version 1.1 built**. The Overview has two layouts, By day (the default) and By hour. See [DESIGN.md](DESIGN.md) for how it looks.

## The idea

One page that shows at a glance when conditions are good for each of my
sports, at each of my sites. It starts with paragliding.

## Key concepts

- **Sport:** has its own **settings** (speed ranges, rain cutoff) that apply
  to every site of that sport.
- **Site:** belongs to a sport. Has a name, a location and its own
  **direction rules** (which compass directions are good or OK).
- **Traffic light:** for each hour at each site,
  🟢 good · 🟡 OK · 🔴 no.

---

## Version 1

### Rating rules
Each daylight hour is checked three ways. The overall rating is the
**worst** of them.

| Check | 🟢 Good | 🟡 OK | 🔴 No |
|---|---|---|---|
| Wind direction | in the site's good directions | in the site's OK directions | anything else |
| Wind speed (mph) | 14–16 (setting) | 12–18 (setting) | outside the OK range |
| Rain | under the cutoff | n/a | at or over the cutoff (default **1 mm**) |

- **Gusts** are shown, but don't affect the rating.
- **Past hours today** are greyed out, and don't count in summaries.
- Forecast: today plus the next 2 days, daylight hours, from Open-Meteo.

### Steps

| # | Step | Status |
|---|---|---|
| 1 | Hourly forecast for Fistral | ✅ done |
| 2 | Traffic-light rating | ✅ done |
| 3 | All starter sites, with summary | ✅ done |
| 4 | **Hour details on tap:** speed, gusts, direction, rain, and *why* it's not green | ✅ done |
| 5 | **Add / edit / delete sites:** name, place search or coordinates, 16-point compass picker. Saved in the browser. "Reset to starter sites" option | ✅ done |
| 6 | **Settings:** good and OK speed ranges, rain cutoff | ✅ done |
| 7 | **Overview: 3 layout options to choose from** (see below) | ✅ done |
| 8 | **Map view:** sites as coloured pins with wind arrows, and a time slider to scrub through the forecast (like Windy) | ✅ done |
| 9 | **Design and polish:** apply DESIGN.md; light/dark follows the phone; "updated at" time and refresh button; loading and error messages | ✅ done |

### Overview options (step 7)
Three ways to answer "where works, when?". Leo tries them, then we keep
the best one (or two).

- **A. By day:** a table with sites down the side and days across. Each
  cell shows the best rating and how many good/OK hours there are, e.g.
  "3h good".
- **B. By hour:** a heatmap with sites down the side and hours across,
  one block per day. You can see every flyable window at once.
- **C. Best times:** a ranked list of flyable windows for each day, e.g.
  "Fistral · 15:00–19:00 · 2h good, 1h OK · W 14–18 mph". Answers
  "where should I go?" directly.

### Starter sites

| Site | Good | OK | Source |
|---|---|---|---|
| Fistral (North & South) | W, WNW, NW | WSW, NNW | Leo |
| Perranporth | W, WNW | WSW, NW | Flybubble |
| St Agnes | N, NNW | NNE, NW | Flybubble |
| Chapel Porth | SW, WSW | – | Flybubble |
| Hale Towans / Black Cliff | NW, NNW | WNW | Flybubble |
| Carn Brea | NW, NNW | – | Flybubble |

### How it's built
- **Plain HTML, CSS and JavaScript, no frameworks**, split into small files
  that each do one job. It still opens by double-clicking index.html.
- **Weather and place search from [Open-Meteo](https://open-meteo.com):**
  free, with no account needed.
- **Map from [Leaflet](https://leafletjs.com)**, with OpenTopoMap tiles
  (hills and contours; dimmed in dark mode).
- **Sites and settings are saved in the browser**, so they live on that
  device only.
- **Git:** a commit after each stage.

---

## Version 1.1 ✅ built

- **Forecast model switcher:** Met Office (UKV), ECMWF, ICON, GFS and AROME,
  the same models Windy offers, via Open-Meteo. Met Office is the default.
  (Open-Meteo's own default for the UK *is* the Met Office model.)
- **7-day forecast** (AROME only goes about 4 days).
- **Checking a forecast:** the hour details show all 5 models side by side,
  each with its name and resolution, plus a link to Windy's point forecast
  for that exact spot.
- **The Flybubble site guide (962 sites)** lives in `data/sites.csv`.
  `tools/build_sites.py` checks it for mistakes and builds `sites.js`.
  `tools/import_flybubble.py` pulls in new sites without overwriting edits.
  The map shows every site as a grey dot; tap one to add it to your sites.
  The site form's search finds guide sites too.
- **A mini compass** on each site card and map popup, showing that site's
  good and OK directions.
- **Animated wind flow on our own map** (leaflet-velocity, fed an 8 × 8
  grid of Open-Meteo wind for 7 days in one request; follows the time
  slider). Windy's embedded map is still there as a second view.
- **Tides** for coastal sites: high and low water times, rising or falling,
  approximate height, and springs / neaps / mid (from the moon's phase).
  Sites can be marked "doesn't work near high tide", with a buffer setting
  (default ±1.5 h).
- **Flying day setting:** sunrise to sunset, or civil twilight (first to
  last light, which changes with the season), plus extra minutes either side.

- **Map timeline like Windy's:** days side by side with an hour bar each,
  coloured by the best rating at any of your sites; a bubble shows the
  chosen time. Drag, tap, use ‹ › or the arrow keys.
- **Hour details step ‹ ›** to the previous or next hour (across days).
- **Live airport wind (METARs)** on the map, via a free Cloudflare Worker
  (`worker/weather-proxy.js`, deployed at
  sport-conditions-weather.leo-h-hyde.workers.dev).
- **Sports:** a sport picker. **Parakiting** is the current sport;
  Paragliding and Surfing are listed as "coming soon". Sites are tagged
  with their sport.
- **Live wind history:** tap a live airport label, then "📈 Last 24 hours",
  for a chart of wind and gusts against your good/OK bands, with direction
  arrows, a table view and a link to the full reports.
- **Live site:** https://leo-hyde.github.io/sport-conditions/ (GitHub Pages,
  updates a minute or two after each push to `main`).

- **Sync between devices:** a private sync code (Settings → Sync), stored
  by the Worker in Cloudflare KV (`SYNC` binding). One-tap sync links.
- **Sites you create** are marked "Added by you" (`custom`).
- **Tides only for beach sites** (`beach` column / site option), with a
  **tide view**: tap a site's tide line for the day's curve.
- **Site guide automation:** editing `data/sites.csv` on GitHub checks it,
  rebuilds `sites.js` and republishes the site.
- **Forecasts kept for 30 minutes** on the device to stay within the free
  forecast service's daily limit.
- **UX review** (see DESIGN.md): next-good-session headline, calm "No",
  shorter site cards, grouped settings.
- **Clearer "By hour"** (22 Oct): times on their own strip ("8h 9h…"),
  speeds only on good/OK hours. The page always opens on Overview → By day.

### Flagged as hard, skipped for now
- **Live weather stations:** airport METARs (e.g. Newquay, EGHQ) are free
  and good, but block requests from web pages, so they need a tiny "proxy"
  server (e.g. a free Cloudflare Worker). OpenWindMap allows it but has
  almost no UK stations. Holfuy (popular with paragliding sites) needs
  an API key per station.
- **Official UK tides (ready, needs a key):** the Worker can fetch Admiralty
  (UK Hydrographic Office) high/low water times and heights from the
  nearest of 607 stations (within 25 km), using a free Discovery key stored
  as the Worker secret `ADMIRALTY_KEY`. Without it, the app uses the
  Open-Meteo tide model.

---

## Version 1.2: feedback while you test (proposed, waiting for Leo's OK)

Leo tests the live site on his phone and wants to say what to change
**without leaving the app**, and without the keyboard covering the screen.
Just Leo for now; other testers later.

| # | Step | Status |
|---|---|---|
| 1 | **Feedback mode** (Settings → Feedback mode, off by default): a small floating 🎙 button above the tab bar. The app stays fully usable underneath. | proposed |
| 2 | **Speak a note:** tap 🎙 and talk; the phone turns speech into text with no keyboard (the browser's speech recognition). A slim bar at the top shows the words; tap ■ to stop. If the browser can't do this, ✎ opens a one-line box at the top (use the keyboard's mic), which closes after "Add". | proposed |
| 3 | **Each note remembers where you were:** tab, layout, open site or hour, screen size, light/dark, app version and time. A badge counts the notes. Notes are kept on the phone until sent. | proposed |
| 4 | **Send:** review the notes (edit, delete), then "Send to GitHub" opens a new GitHub Issue with them all filled in, labelled `feedback`. Tap "Create". | proposed |
| 5 | **Versions:** a version number in Settings (starting at 1.2) and a `CHANGELOG.md` saying what changed in each. | proposed |

**Claude's side:** when Leo says "check feedback", Claude reads the open
`feedback` issues, sorts them into easy / needs discussion / later, keeps
`docs/BACKLOG.md` up to date, builds what's agreed, and closes each issue
with the version that fixed it.

**Later:** other testers without GitHub accounts (send through the Worker,
with a personal code per approved tester); collaborators working through
pull requests.

---

## Later

Roughly in suggested order. Each gets its own short spec before building.

- **A. Put it online and on your phone:** host it free on GitHub Pages,
  installable to the home screen.
- **B. Sync sites between devices:** a small online database with sign-in.
  Stop-gap: an export/import button.
- **C. Gusts in the rating:** too gusty, or too big a gap between gusts and
  average wind, makes an hour 🔴.
- **D. Thermals and cloud base:** boundary layer height, CAPE and cloud base,
  as an "XC potential" indicator.
- **E. More sports:** kitesurfing (wind and tide) and surfing (swell, from
  Open-Meteo's marine forecast), with a sport switcher.
- **F. Map extras:** tap the map to place a new site; a wind overlay
  like Windy's.
- **G. Alerts:** e.g. "tell me when Fistral is 🟢 for 3h or more this
  weekend". Needs A and B first.
- **H. Better forecasts:** compare weather models; live station readings.
- **I. More sites:** from an open data source, or from Flybubble with
  permission.
