# Sport Conditions: Product Spec

Status: **Beta** (version 1.2 built: feedback mode). The Overview has two layouts, By day (the default) and By hour. See [DESIGN.md](DESIGN.md) for how it looks.

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

## Version 1.2: feedback while you test ✅ built

Leo tests the live site on his phone (Android, Chrome) and says what to
change **without leaving the app**, and without the keyboard covering the
screen. Just Leo for now; other testers later. Must work on any phone and
browser (Android and iPhone, Chrome and Safari).

| # | Step | Status |
|---|---|---|
| 1 | **Feedback mode** (Settings → Feedback, or a link ending `?feedback=on`; off by default): floating buttons above the tab bar (🎙 speak, ✎ type, 📝 notes with a count). The app stays usable underneath. When a panel is open, the buttons move into it so they still work. | ✅ done |
| 2 | **Speak a note:** tap 🎙 and talk; the browser's speech recognition turns it into text, so no keyboard. A bar at the top shows the words; tap Done. Phones stop listening after a pause, so it restarts until Done. If the browser can't (or the mic is blocked), it falls back to ✎: a text box at the top, so the keyboard doesn't cover it; Enter or Done saves and closes the keyboard. | ✅ done |
| 3 | **Each note remembers where you were:** time, tab and layout, open panel (e.g. "Fistral, Today 10:00"), map time, screen size, light/dark, forecast model, browser. Kept on the phone until sent. | ✅ done |
| 4 | **Send:** 📝 lists the notes (edit, delete). "Send to GitHub" opens a new GitHub Issue with them filled in (title "Feedback: …", label `feedback`); tap "Create". Big batches are split so the link isn't too long. Then "Created: clear sent notes" or "Didn't work: put them back". | ✅ done |
| 5 | **Versions:** no version numbers. The app is in **Beta**; every change is in git; `CHANGELOG.md` lists changes by date in plain English. Big milestones (e.g. a new sport) get a git tag, a named bookmark we can go back to. | ✅ done |

**Claude's side:** when Leo says "check feedback", Claude reads the open
feedback issues, sorts them into easy / needs discussion / later, keeps
`docs/BACKLOG.md` up to date, builds what's agreed, adds it to
`CHANGELOG.md`, and closes each issue saying what changed.

**Later:** other testers without GitHub accounts (send through the Worker,
with a personal code per approved tester); collaborators working through
pull requests.

**Changes from feedback (22 Oct, issues #1–#3):** one-tap **Send** (with a
send code, straight to GitHub through the Worker's `/feedback`, which needs
the secrets `GITHUB_TOKEN` and `FEEDBACK_CODE`; without, GitHub opens filled
in); 📝 is now **Your requests**; notes list every place visited while
speaking; the screen stays on and no words are lost; the page reopens on the
tab you left; finer finger control on the map timeline; tide state on beach
sites' map labels.

---

## Version 1.3: Surfing (proposed, waiting for Leo's OK)

Leo wants surfing as a sport, with Surfline-quality information, combined
with tides: e.g. "this spot doesn't work 2 hours either side of low tide".

### Where the data comes from
- **Surfline: link to it, don't copy it.** Surfline has no public API. Its
  forecasts are its paid product, its terms forbid copying them, and the
  unofficial addresses some hobby apps use can change or be blocked at any
  time. Publishing that on a public site would be risky. Instead each surf
  spot gets an **"Open on Surfline"** button to that spot's page (like the
  Windy link), so Surfline is one tap away.
- **Waves: Open-Meteo's free Marine forecast** (no key, works from web
  pages): swell height, period and direction, and wind-wave height, hourly
  for 7 days. It's the same kind of model data Surfline starts from, without
  Surfline's hand-tuning per spot. It counts towards the same 10,000-a-day
  limit (one call per spot).
- **Wind:** the forecasts we already fetch (5 models).
- **Tides:** the Admiralty tide times we already fetch through the Worker.

### Rating a surf hour (worst of these, like now)
| Check | 🟢 Good | 🟡 OK | 🔴 No | Belongs to |
|---|---|---|---|---|
| Swell height | e.g. 0.8–2 m | e.g. 0.5–2.5 m | outside OK | sport (settings) |
| Swell period | e.g. 10 s or more | e.g. 7 s or more | shorter | sport (settings) |
| Swell direction | site's good directions | site's OK directions | anything else | site (compass) |
| Wind | offshore, or under e.g. 8 mph | cross-shore, or under e.g. 15 mph | onshore and stronger | site (offshore directions) + sport (speeds) |
| Tide | outside the spot's no-go window | | inside it | site (tide rule) |

### Steps
| # | Step | Status |
|---|---|---|
| 1 | **Tide rules for any site:** "doesn't work within X hours of low / high water" (replaces "not near high tide"; works for parakiting too) | proposed |
| 2 | **Settings per sport:** surfing gets its own wave height and period ranges, kept separate from parakiting's wind ranges | proposed |
| 3 | **Surf spots:** name, place, swell compass (good/OK swell directions), wind compass (offshore directions), tide rule, Surfline link. Starting with Leo's spots | proposed |
| 4 | **Wave forecasts and surf ratings** on the Overview and site cards | proposed |
| 5 | **Surf hour details:** swell, period, direction, wind, tide, and why it isn't green; "Open on Surfline" | proposed |
| 6 | **Map:** surf spots rated by the time slider, with tide state (already there for beach sites) | proposed |

### Questions for Leo
- Which surf spots first, and for each: good swell directions, offshore wind
  directions, and tide no-go windows?
- What's good surf for you: wave height (metres or feet?) and period?
- Is "Open on Surfline" plus our own ratings enough, or is there something
  specific from Surfline you'd miss (e.g. surf cams, their star rating)?

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
