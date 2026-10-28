# Surf forecast: research for a rebuild (28 Oct 2026)

Leo asked for a deep dive into how Surfline makes its forecasts, which of its
data is open, and whether there are APIs, because the current surfing build
(version 1.3) won't work. **Nothing here is agreed yet**: it's the evidence
for a decision. Nothing in the app has changed.

How sure each point is: ✅ checked in a source; ⚠️ from third-party sources
or memory, not checked. This session's network blocked surfline.com,
open-meteo.com and medium.com, so I worked from search results and could
not test any API live.

## 1. Why the current build fails (my own critique)
- It uses `wave_height` (surf.js:68): **all waves added together, wind chop
  included**. A 4 ft mess of local wind waves and a 4 ft clean 14-second
  swell get the same number, but surf very differently.
- **Height doesn't depend on period.** A long-period swell breaks much bigger
  than its open-sea height; a short one breaks smaller. We ignore this.
- **Only one swell.** Cornwall often has two swells at once (a long Atlantic
  groundswell and a shorter local one). We take one direction and period.
- **The size factor is one number per spot.** In reality a spot's shelter
  depends on the swell's direction: Towan is small in a W swell but not in a
  NW one. One fixed factor can't do that. And the factors are my guesses.
- **The forecast point is 2.5 km out to sea** on a 5–25 km grid: the
  forecast is for open water, with no seabed effects at all.

## 2. How Surfline does it
1. **Global wind and wave models.** Wind forecasts drive an ocean wave model
   (the standard is NOAA's WAVEWATCH III ✅). It forecasts the swell out at
   sea, split into separate swells ("partitions") with height, period and
   direction each. Surfline runs its own global wind model too ⚠️ (Windy
   users reported 15 km LOTUS winds).
2. **Nearshore modelling to the beach** ✅: "Our nearshore models actually
   take deep water data all the way to the beach." The offshore swell is
   carried over the seabed (bathymetry: the map of water depth), bending and
   growing or shrinking, to where waves break at each spot. Its first system,
   LOLA (2001), combined satellite data, bathymetry and nearshore buoys ✅.
3. **Breaking surf height**, as a min–max face height in feet ✅ (face =
   the front of the wave, which is how surfers talk).
4. **Machine learning on top** ✅: LOTUS learns from decades of human surf
   reports, years of camera data, and live buoys and satellites, and corrects
   the physics where it's systematically wrong. Users can now report "was the
   forecast right?", which feeds back into it ✅.
5. **Human forecasters** write the ratings and reports for each spot.

Steps 1 and the raw inputs are open science. Steps 2–5 are what Surfline
sells: the per-spot tuning, the reports and the cameras.

## 3. What's open, and what isn't
| Piece | Open? | Where |
|---|---|---|
| Global wave models with separate swells | ✅ Free | Open-Meteo Marine (already used): primary, secondary and tertiary swell height, period, direction ⚠️ variable names to confirm; several models (ECMWF, Météo-France, DWD, NOAA) ⚠️ list to confirm. Free for non-commercial use |
| Same data, raw | ✅ Free | Copernicus Marine (Météo-France MFWAM, wind sea + primary + secondary swell ✅), NOAA WAVEWATCH III. Big files, not for a web page |
| Seabed depth | ✅ Free | GEBCO (world), EMODnet (Europe) ⚠️ not checked this session |
| Live wave buoys near Newquay | ✅ Free with a key | Channel Coastal Observatory: Perranporth Waverider, since 2006 ✅. Its API needs a key tied to a web address ✅ |
| Surfline's surf heights and ratings | ❌ Not open | No public or partner API found ✅. An unofficial one exists (below) |
| Surfline cameras, reports, LOTUS internals | ❌ | Premium, not available |
| Magicseaweed | ❌ Gone | Bought by Surfline, shut down in 2023 with its API ✅ |
| Stormglass | Paid | Free plan is 10 calls a day, not for commercial use; €19 a month for 500 ✅. Same open models underneath, so no better at the beach |

### The unofficial Surfline API
- `https://services.surfline.com/kbyg/spots/forecasts/{wave|wind|tides|weather}?spotId=…&days=…&intervalHours=…`
  ✅ (from a GitHub project's README). No key; up to 6 days without a login
  ✅, 16–17 with a premium login. Returns surf min/max, swells, and
  `optimalScore` ratings ⚠️ exact fields not checked.
- **Not a public API**: undocumented, worked out from Surfline's own website
  code. It can change or be blocked at any time; the old v1 version was cut
  back ✅.
- **Terms**: I couldn't read surfline.com/terms-of-use (blocked). Most sites
  like this forbid automated access ⚠️. Our decision of 23 Oct (SPEC.md:
  "linked, not copied") was based on this.
- Whether a web page can call it directly (CORS) is unknown; it would
  probably need our Worker in between.

## 4. Options
- **A. Use Surfline's unofficial API** (through the Worker). Best numbers,
  the ones Leo already trusts. But it undoes a decision, probably breaks
  Surfline's terms, sits in a public repo, and could stop working any day.
  Only defensible for Leo's personal use, and only once we've read the
  terms. Could ask Surfline for permission first (cheap to try).
- **B. Do a small version of what Surfline does, from open data.**
  1. Ask Open-Meteo for each swell separately (not `wave_height`), and
     compare models.
  2. For each spot and each swell: how exposed the spot is to that direction
     (a "swell window", like the wind-direction rules) and a breaking-height
     formula from height and period (Komar and Gaughan, 1972 ✅: breaking
     height grows with period). Combine the swells into a min–max face height.
  3. Calibrate against reality: the Perranporth buoy (is the model right
     offshore?) and Leo's own notes of what the surf was actually like (the
     small-scale version of Surfline's feedback loop).
  This is roughly Surfline's 2001 approach (LOLA) without the seabed
  modelling. Honest limit: it will be a rough guide, not Surfline-quality,
  until it's calibrated.
- **C. Pay for Stormglass.** Doesn't fix the real problem (it's the same
  offshore models).

**My recommendation: B**, keeping the Surfline link for checking against.
Ask Surfline about A separately if Leo wants it.

## 5. Update, later on 28 Oct: Surfline's API is closed, and alternatives
**Leo chose to use Surfline's unofficial API (option A), but it doesn't
work.** With the real Fistral North ID (`584204214e65fad6a7709cec`), Leo's
phone got "404 Not Found" (the address no longer exists). From this session,
Cloudflare (Surfline's security service) refused every request with "403"
and a bot check, which would block our Worker too. Leo has Surfline Pro, but
that comes with no API or data export ⚠️ (none found).

Leo doesn't want to build our own model. Here are the other sources, for
spots around Cornwall:

| Source | What it gives | Cost | Fit |
|---|---|---|---|
| **SurfMap API** (surf-map.com/api) | Hourly forecasts for 5,000+ named spots, rated by surfer level, with waves, wind and tide ✅ | Free "Developer" plan: 3 days, 50 calls a day, for 60 days. Then $39 a month (500 calls a day) ✅. Early access: you apply | **Closest to what Leo wants.** Unknown: whether it has the Newquay spots, how it makes its ratings, how good it is |
| **Swellcloud API** (api.swellcloud.net) | Wave height, period, direction, wind, secondary swell at a point; 16 days (0.25°), or Copernicus 10 days ✅ | Free key ✅ (may change) | Offshore numbers, like Open-Meteo. No spot surf heights |
| **Windy Point Forecast API** | NOAA's wave model only (no ECMWF), swell and swell 2 ✅ | €990 a year; the free tier gives scrambled test data ✅ | Expensive, offshore only |
| **Stormglass** | Several models, offshore | 10 calls a day free; €19 a month ✅ | Offshore only |
| **MetOcean / MetService point APIs** | ECMWF and WAVEWATCH III waves ✅ | From $30 a month ✅ | Offshore only |
| **Surf-forecast.com** (Meteo365, UK) | Per-break forecasts, 7,000 breaks | No API found ✅ | Could ask them about a licence |
| **Windguru** | Wind and waves per spot | No official API found ✅ | Scraping only, no |
| **Plymouth University's OWWL model** | A nearshore wave model for the South West coast at 1 km (Delft3D, driven by Met Office data), 3-day forecast, checked daily against buoys ✅ | Free to view ✅; no download or API found | **The best open nearshore model for Cornwall.** Built for flooding, not surf. Could ask the researchers for data |
| **Met Office North West Shelf wave model** (Copernicus) | Waves at 1.5 km, hourly, 7 days ✅ | Free with sign-up ⚠️ (licence not read) | Closer to the coast than Open-Meteo, but needs a daily download job, and it's still before the waves break |

**Honest bottom line.** Nobody offers free, spot-by-spot surf heights for
Cornwall the way Surfline did. The free sources all stop before the waves
break. Turning their swell into "Fistral is 3–4 ft and good" is the per-spot
tuning that every surf site does for itself. The only ready-made service
that does that tuning is SurfMap (paid after 60 days, quality unknown).

**Recommendation:** try SurfMap's free plan on the Newquay spots and compare
it with Surfline for a couple of weeks, before paying anything.

## Sources
- Surfline, LOTUS: https://www.surfline.com/lp/whatsnew/features/lotus-swell-model
- Surfline, forecast feedback: https://www.surfline.com/lp/whatsnew/features/forecast-feedback
- Surfline Labs, machine learning: https://medium.com/surfline-labs/machine-learning-for-surf-forecasting-4a007f13b3e3
- Unofficial API: https://github.com/ketoloco/meta-surf-forecast
- Open-Meteo Marine: https://open-meteo.com/en/docs/marine-weather-api
- Copernicus MFWAM: https://data.marine.copernicus.eu/product/GLOBAL_ANALYSISFORECAST_WAV_001_027/description
- NOAA nearshore (WW3, SWAN): https://ams.confex.com/ams/93Annual/webprogram/Manuscript/Paper222877/AMS2013_Westhuysen-etal_ext_abstr_paper4-5.pdf
- CCO API: https://coastalmonitoring.org/ccoresources/api/
- Stormglass pricing: https://stormglass.io/
- Komar and Gaughan: https://trid.trb.org/View/14064
- Magicseaweed closure: https://breakfinder.surf/blog/magicseaweed-shutdown-where-surfers-went
- SurfMap API: https://surf-map.com/api/
- Swellcloud API: https://api.swellcloud.net/
- Windy Point Forecast pricing: https://api.windy.com/point-forecast/pricing
- MetOcean point API: https://metocean.co.nz/weather-forecast-api
- Plymouth OWWL: https://www.plymouth.ac.uk/news/university-wave-model-to-enable-preparation-for-storm-events-in-the-south-west and https://sweep.ac.uk/tools/owwl
- Met Office NW Shelf waves: https://data.marine.copernicus.eu/product/NWSHELF_ANALYSISFORECAST_WAV_004_014/description
- Surfline alternatives: https://lazysurfer.app/compare/surfline-alternatives.html
- Windguru comparison: https://breakfinder.surf/it/blog/breakfinder-vs-windguru
