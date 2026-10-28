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
