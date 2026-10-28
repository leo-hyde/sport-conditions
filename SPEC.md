# Sport Conditions: Product Spec

This file says what the app does, and is the plan. Status: **Beta**
(version 1.3 built: surfing; updated 26 Oct 2026). What comes next is in
[What's next](#whats-next) below. The Overview has two layouts: By day (the
default) and By hour. [DESIGN.md](DESIGN.md) says how it looks.

## The idea

One page that shows at a glance when conditions are good for each of my
sports, at each of my sites. It started with parakiting (the first plan
said paragliding), and surfing is the second sport.

## Key ideas

- **Sport:** each sport has its own **settings** (speed ranges, rain cutoff).
  They apply to every site of that sport.
- **Site:** a place that belongs to one sport. It has a name, a location and
  its own **direction rules**: which compass directions are good or OK there.
- **Traffic light:** every hour at every site gets a rating:
  🟢 good · 🟡 OK · 🔴 no.

---

## Version 1

### Rating rules
The app checks each daylight hour in three ways. The hour's overall rating
is the **worst** of the three.

| Check | 🟢 Good | 🟡 OK | 🔴 No |
|---|---|---|---|
| Wind direction | in the site's good directions | in the site's OK directions | anything else |
| Wind speed (mph) | 14–16 (setting) | 12–18 (setting) | outside the OK range |
| Rain | under the cutoff | n/a | at or over the cutoff (default **1 mm**) |

- **Gusts** are shown, but they don't change the rating.
- **Hours already past today** are greyed out. They don't count in summaries.
- The forecast covers today and the next 2 days, daylight hours only. It
  comes from Open-Meteo, a free weather service.

### Steps

| # | Step | Status |
|---|---|---|
| 1 | Hourly forecast for Fistral | ✅ done |
| 2 | Traffic-light rating | ✅ done |
| 3 | All starter sites, with a summary | ✅ done |
| 4 | **Tap an hour for details:** speed, gusts, direction, rain, and *why* it isn't green | ✅ done |
| 5 | **Add, edit and delete sites:** name, a place search or map coordinates, and a 16-point compass to pick directions. Saved in the browser. A "Reset to starter sites" option | ✅ done |
| 6 | **Settings:** good and OK speed ranges, rain cutoff | ✅ done |
| 7 | **Overview: 3 layouts to choose from** (see below). By day and By hour kept; Best times removed 21 Oct | ✅ done |
| 8 | **Map view:** sites as coloured pins with wind arrows. A time slider moves through the forecast (like Windy, a popular weather map site) | ✅ done |
| 9 | **Design and polish:** follow DESIGN.md; light or dark to match the phone; an "updated at" time and a refresh button; loading and error messages | ✅ done |

### Overview layouts (step 7)
Three ways to answer "where works, and when?". Leo tries them all. Then we
keep the best one or two. **Result (21 Oct):** we kept A and B, and removed C.

- **A. By day:** a table with sites down the side and days across. Each
  cell shows the best rating and how many good or OK hours there are, for
  example "3h good".
- **B. By hour:** a colour grid with sites down the side and hours across,
  one block per day. You can see every flyable stretch at once.
- **C. Best times:** a ranked list of flyable stretches for each day, for
  example "Fistral · 15:00–19:00 · 2h good, 1h OK · W 14–18 mph". It
  answers "where should I go?" directly.

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
- **Plain web page files, no frameworks.** (A framework is a large ready-made
  toolkit for building apps.) The code is split into small files that each do
  one job. You can still open it by double-clicking index.html.
- **Weather and place search come from [Open-Meteo](https://open-meteo.com).**
  It's free, and you don't need an account.
- **The map uses [Leaflet](https://leafletjs.com)**, a free map library. Its
  background is OpenTopoMap, which shows hills and contours. It's dimmed in
  dark mode.
- **Sites and settings are saved in the browser**, so they stay on that
  device only.
- **Git** (the tool that keeps every version of the files): a commit, a saved
  snapshot of the files, after each stage.

---

## Version 1.1 ✅ built

- **Choice of forecast model.** (A model is a computer forecast from one
  weather centre.) The choices are Met Office (UKV), ECMWF, ICON, GFS and
  AROME. Windy offers the same ones, and the app gets them all through
  Open-Meteo. Met Office is the default. (Open-Meteo's own default for the
  UK *is* the Met Office model.)
- **7-day forecast.** AROME only goes about 4 days ahead.
- **Checking a forecast:** the hour details show all 5 models side by side.
  Each one shows its name and resolution (how fine its detail is). There's
  also a link to Windy's forecast for that exact spot.
- **The Flybubble site guide (962 sites)** is kept in `data/sites.csv`, a
  spreadsheet file. `tools/build_sites.py` checks it for mistakes and builds
  `sites.js` from it, which the app reads. `tools/import_flybubble.py` brings
  in new sites without overwriting our edits. The map shows every guide site
  as a grey dot; tap one to add it to your sites. The site form's search
  finds guide sites too.
- **A mini compass** on each site card and map pop-up. It shows that site's
  good and OK directions.
- **Animated wind flow on our own map.** It uses leaflet-velocity, an add-on
  to the map library. One request to Open-Meteo gets the wind for an 8 × 8
  grid of points for 7 days. The flow follows the time slider. Windy's own
  map is still there as a second view.
- **Tides** for coastal sites: high and low water times, rising or falling,
  rough height, and springs, neaps or in between (worked out from the moon's
  phase). Sites can be marked "doesn't work near high tide", with a margin
  setting (default ±1.5 h).
- **Flying day setting:** either sunrise to sunset, or civil twilight (first
  to last light, which changes with the season). You can add extra minutes
  at either end.

- **A map timeline like Windy's:** the days sit side by side, each with a
  bar of hours. Each hour is coloured by the best rating at any of your
  sites. A bubble shows the chosen time. Drag, tap, use ‹ › or the arrow keys.
- **Hour details have ‹ › buttons** to step to the previous or next hour,
  across days.
- **Live airport wind** on the map. It comes from airport weather reports
  (called METARs). They reach the app through our free Cloudflare Worker, a
  small program that runs on Cloudflare's servers (`worker/weather-proxy.js`,
  running at sport-conditions-weather.leo-h-hyde.workers.dev).
- **Sports:** a sport menu. **Parakiting** was the first sport. Paragliding
  and Surfing were listed as "coming soon"; Surfing has since been built
  (version 1.3), and Paragliding is still "coming soon". Each site is tagged
  with its sport.
- **Live wind history:** tap a live airport label, then "📈 Last 24 hours".
  You get a chart of wind and gusts against your good and OK ranges, with
  direction arrows, a table version and a link to the full reports.
- **Live site:** https://leo-hyde.github.io/sport-conditions/. It's hosted
  free on GitHub Pages and updates a minute or two after each push (upload)
  to `main`.

- **Sync between devices:** a private sync code (Settings → Sync). The Worker
  stores your sites under it in Cloudflare KV, a simple online store
  (connected to the Worker as `SYNC`). One-tap sync links.
- **Sites you create** are marked "Added by you" (`custom` in the code).
- **Tides only for beach sites** (the `beach` column, or a site option). There
  is also a **tide view**: tap a site's tide line to see the day's tide curve.
- **The site guide updates itself:** editing `data/sites.csv` on GitHub checks
  it, rebuilds `sites.js` and republishes the site.
- **Forecasts are kept for 30 minutes** on the device. That keeps us within
  the free forecast service's daily limit.
- **Design review** (see DESIGN.md): a "next good session" headline, a calm
  "No", shorter site cards and settings in groups.
- **Clearer "By hour"** (22 Oct): times sit on their own strip ("8h 9h…"),
  and only good and OK hours show a speed. The page always opens on
  Overview → By day.

### Hard, so skipped for now
- **Live weather stations:** airport weather reports (METARs, for example
  Newquay, EGHQ) are free and good. But they block requests from web pages,
  so they need a tiny go-between server (a "proxy", for example a free
  Cloudflare Worker). OpenWindMap allows requests from web pages, but has
  almost no UK stations. Holfuy (popular with paragliding sites) needs a
  separate access key for each station.
- **Official UK tides (ready, but needs a key):** the Worker can fetch high
  and low water times and heights from the Admiralty (the UK Hydrographic
  Office). It uses the nearest of 607 tide stations, within 25 km. It needs
  a free "Discovery" key, kept as a secret in the Worker called
  `ADMIRALTY_KEY`. Without the key, the app uses Open-Meteo's tide model.

---

## Version 1.2: feedback while you test ✅ built

Leo tests the live site on his phone (Android, Chrome). He says what to
change **without leaving the app**, and without the keyboard covering the
screen. It's just Leo for now; other testers come later. It must work on any
phone and browser (Android and iPhone, Chrome and Safari).

| # | Step | Status |
|---|---|---|
| 1 | **Feedback mode** (Settings → Feedback, or a link ending `?feedback=on`; off at first): buttons float above the tab bar (🎙 speak, ✎ type, 📝 notes with a count). You can still use the app underneath. When a panel is open, the buttons move into it so they still work. | ✅ done |
| 2 | **Speak a note:** tap 🎙 and talk. The browser's speech recognition turns your words into text, so you don't need the keyboard. A bar at the top shows the words; tap Done. Phones stop listening after a pause, so it starts again until you tap Done. If the browser can't listen (or the microphone is blocked), you get ✎ instead: a text box at the top, so the keyboard doesn't cover it. Enter or Done saves the note and closes the keyboard. | ✅ done |
| 3 | **Each note remembers where you were:** the time, tab and layout, any open panel (for example "Fistral, Today 10:00"), the map time, screen size, light or dark, forecast model and browser. Notes stay on the phone until you send them. | ✅ done |
| 4 | **Send:** 📝 lists your notes, which you can edit or delete. "Send to GitHub" opens a new GitHub Issue (a to-do note on the project) with them filled in, titled "Feedback: …" with the label `feedback`. Then you tap "Create". Big batches are split so the link isn't too long. Afterwards, tap "Created: clear sent notes" or "Didn't work: put them back". | ✅ done |
| 5 | **Versions:** no version numbers. The app is in **Beta** (still being tested). Git keeps every change. `CHANGELOG.md` lists changes by date in plain English. Big milestones (for example a new sport) get a git tag: a named bookmark we can go back to. | ✅ done |

**Claude's side:** when Leo says "check feedback", Claude reads the open
feedback issues. It sorts them into easy, needs discussion and later. It
keeps `docs/BACKLOG.md` up to date, builds what's agreed and adds it to
`CHANGELOG.md`. Then it closes each issue, saying what changed.

**Later:** other testers without GitHub accounts (notes sent through the
Worker, with a personal code for each approved tester). Collaborators
working through pull requests (proposed changes that Leo reviews before they
go in).

**Changes from feedback (26 Oct, issues #5 and #8):** a ◎ button on the map
shows where you are; a ⏸ button pauses a voice note.

**Changes from feedback (22 Oct, issues #1–#3):**
- One-tap **Send**. With a send code, notes go straight to GitHub through the
  Worker's `/feedback` address. That needs two Worker secrets, `GITHUB_TOKEN`
  and `FEEDBACK_CODE`. Without them, GitHub opens with the note filled in.
- 📝 is now called **Your requests**.
- Notes list every place you visited while speaking.
- The screen stays on, and no words are lost.
- The page reopens on the tab you left.
- Finer finger control on the map timeline.
- Beach sites' map labels show the state of the tide.

---

## Version 1.3: Surfing ✅ built (23 Oct)

Surfing is a second sport, starting with the Newquay spots. They're rated
good, OK or no, like parakiting, with a link to Surfline for each spot.

### Where the data comes from
- **Surfline: linked, not copied.** Surfline has no public API (a way for
  other apps to fetch its data). Its forecasts are what it sells, and its
  terms forbid copying them. Each spot has a Surfline button. At first it
  searches Surfline for that spot. Once you paste the spot's real Surfline
  page address in (Edit → Surfline link), it goes straight there.
- **Waves: Open-Meteo Marine** (free, no key). It gives wave height, swell
  period and swell direction, every hour for 7 days. The app asks for a point
  about 2.5 km out to sea from each spot. That way the point always falls in
  a sea square of the forecast's grid. The heights are computer forecasts for
  open water, not Surfline's hand-tuned heights of breaking waves, so treat
  them as a guide. Each spot is one call, and it counts towards the same
  daily limit.
- **Wind and tides:** the same as for parakiting (the chosen model; Admiralty
  tides).

### Borrowed from Surfline
- **Wave height in feet**, and the same plain words for size ("knee to
  waist", "head high"…) in the hour details.
- Not their ratings (Poor, Fair, Good…). Those are the judgement of
  Surfline's own forecasters for each spot. We keep good, OK and no, so
  every sport works the same way on the Overview and map.

### Rating a surf hour (the worst of these)
| Check | 🟢 Good | 🟡 OK | 🔴 No | Set in |
|---|---|---|---|---|
| Wave height (ft) | 3–6 | 2–8 | outside OK (at least 2 ft, as Leo asked) | sport settings |
| Swell period (s) | 10+ | 7+ | shorter | sport settings |
| Swell direction | site's good directions | site's OK directions | anything else | site (swell compass) |
| Wind | offshore up to 25 mph, or any direction up to 6 mph | other directions up to 12 mph | stronger onshore or cross-shore | site (offshore directions) + sport settings |
| Tide | outside the spot's tide window | | inside it | site (tide rule) |

Daylight hours work as they do for parakiting (Settings → Daylight). Rain
doesn't count.

### Tide rules (both sports, editable for each site)
The choices: any tide · not within N hours of low water · not within N hours
of high water · only within N hours of low water · only within N hours of
high water. These replace "doesn't work near high tide". Older sites keep
their setting.

### Newquay spots (data/surf-spots.csv; locations and directions are rough and can be edited)
Fistral North, Fistral South, Little Fistral, Towan, Great Western,
Tolcarne, Lusty Glaze, Porth, Watergate Bay, Mawgan Porth, Crantock,
Holywell Bay. Tide rule: not within 2 hours of low water, except Watergate
Bay (any tide), as Leo asked. The Cribbar is left out: it's a reef for big
waves only.

### Steps
| # | Step | Status |
|---|---|---|
| 1 | Tide rules for any site | ✅ done |
| 2 | Settings for each sport (surfing: wave, period and wind ranges) | ✅ done |
| 3 | Surf spots guide (`data/surf-spots.csv` → `surfSpots.js`) | ✅ done |
| 4 | Wave forecasts and surf ratings, shown on the Overview, cards, hour details and map | ✅ done |
| 5 | Site form for surf spots: swell compass, offshore wind compass, tide rule, Surfline link | ✅ done |

---

## What's next

The steps we've agreed, in order. docs/STATUS.md points at these numbers.

| # | Step | Status |
|---|---|---|
| 1 | **Leo tries Surfing on the live site** (sport menu → Surfing) and checks the Newquay spots' locations, directions and tide rules | Waiting for Leo |
| 2 | **Automated tests of the rating rules** (see docs/ARCHITECTURE.md "Weak spots"). Spec first: `specs/rating-tests.md` (not written yet), then build it in a fresh session | Not started |
| 3 | **Design review fixes (issue #13).** Steps 1 and 2 (tap sizes, 16px dropdowns, contrast, plain tide words, grey past hours, table marks) are live. Step 3, compact site cards: `specs/compact-site-cards.md` | Spec waiting for Leo to approve |

Open feedback issues (#4–#8) are sorted when Leo says "check feedback";
anything agreed from them is added here.

---

## Later

Roughly in the order we suggest. Each one gets its own short spec before
we build it. (Status notes added 26 Oct 2026.)

- **A. Put it online and on your phone:** host it free on GitHub Pages, and
  let you add it to your home screen. *Online: done (version 1.1). Home
  screen: not done.*
- **B. Sync sites between devices:** a small online database with sign-in.
  Until then: an export and import button. *Built differently in version
  1.1: a private sync code, no sign-in. Not working yet: the Worker's
  storage isn't connected.*
- **C. Gusts in the rating:** an hour becomes 🔴 if it's too gusty, or if
  gusts are too far above the average wind.
- **D. Thermals and cloud base:** boundary layer height, CAPE (a measure of
  how much air rises) and cloud base, shown as a sign of "XC potential"
  (how good it is for flying cross-country).
- **E. More sports:** kitesurfing (wind and tide) and surfing (swell, from
  Open-Meteo's marine forecast), with a sport menu. *Sport menu and surfing:
  done (version 1.3). Kitesurfing: not done.*
- **F. Map extras:** tap the map to place a new site; a wind layer like
  Windy's. *Done (version 1.1).*
- **G. Alerts:** for example "tell me when Fistral is 🟢 for 3 hours or more
  this weekend". Needs A and B first.
- **H. Better forecasts:** compare weather models; live readings from
  weather stations. *Done (version 1.1): 5 models, and live airport wind.*
- **I. More sites:** from an open data source, or from Flybubble with their
  permission.
