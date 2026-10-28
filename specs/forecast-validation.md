# Checking our forecast against Windy (issue #12)

Leo noticed the app's Met Office wind at Fistral reads lower than Windy's for
the same hour. This step finds out why, with evidence, before changing the app.

## The question
Are we showing the same forecast Leo sees on Windy (same model, same place,
same units), and if not, what's different?

## How we check
1. **Read Windy's numbers.** In the built-in browser, open
   `https://www.windy.com/<lat>/<lon>/ukv` and run `tools/windy_read.js` in
   the page. It switches Windy's forecast table between UKV, ECMWF, ICON-EU,
   AROME-HD and GFS and copies out wind (knots) for each 3-hour slot.
2. **Compare with Open-Meteo.** `python3 tools/windy_compare.py <file>`
   fetches the same models from Open-Meteo for the same place, twice: the
   nearest *land* grid square (what the app uses now) and the nearest *sea*
   square. It prints the average gap to Windy for each.
3. **Sites:** Fistral, Perran Sands, Woolacombe (coastal) and Cox Tor
   (inland, Dartmoor), so we see whether a rule for coastal sites holds.
   About 8 Open-Meteo calls in total.

## Out of scope
Changing the app. That comes after, as its own small step, once the numbers
say which rule to use.

## Done when
The findings below say, per model, which grid square matches Windy, for all
four sites, and recommend a change (or none).

## Findings (28 Oct 2026, evening, first 48 hours)

**Same model.** The app's "Met Office" (`ukmo_seamless` on Open-Meteo) gives
exactly the same numbers as the UKV 2 km model for the first two days, which
is what Windy calls "UKV 2km". Units are fine: Windy shows knots, the app mph.

**But Windy's point forecast defaults to "meteoblue AI"**, not UKV, even when
the map shows UKV. Unless Leo switched "Source:" under the table, he was
comparing against a different forecast.

**The grid square differs.** Open-Meteo gives one 2 km square: by default the
nearest *land* square. Windy seems to blend the squares around the point
(not confirmed; it's what the numbers suggest).

Average gap to Windy, knots (+ = Open-Meteo higher):

| Site | UKV land (app now) | UKV sea | ECMWF land | ECMWF sea |
|---|---|---|---|---|
| Fistral | −1.7 | +0.1 | +1.3 | +5.2 |
| Perran Sands | −1.0 | +0.3 | −1.3 | +5.9 |
| Woolacombe | −1.2 | −1.2 (same square) | −1.7 | +3.5 |
| Cox Tor (inland) | +0.2 | −1.1 | +0.3 | +4.0 |

- At coastal sites the app's Met Office wind reads **about 1–2 knots (1–2
  mph) lower** than Windy's UKV on average, and up to 4–5 knots in single
  hours (Fistral, this morning). Inland it matches.
- Using the **sea square for UKV** at coastal sites closes the gap at Fistral
  and Perran Sands (within 0.3 knots). It makes no difference at Woolacombe.
- The sea square is **wrong for ECMWF** (3.5–6 knots too high), so any
  change must apply to the Met Office model only.
- ICON-EU, AROME-HD and GFS: within about 2 knots either way.

Limits: one evening's forecast, four sites, Windy's 3-hour table (whole
knots). Windy may have used a slightly different model run.

## Decision (28 Oct 2026)
Keep Open-Meteo's default grid square. Leo first asked for "the square the
site is in" (`cell_selection=nearest`); re-running the check showed it's the
same square at all three coastal sites (no change to the gap) and further from
Windy at Cox Tor (Met Office −1.1) and Woolacombe (ECMWF +3.5). The default
also picks a land square at a similar height, which suits hill sites. The sea
square for coastal sites (Met Office only) was the one change that closed the
gap at Fistral; not done, as 1–2 knots on average isn't worth the extra
requests and special case. Windy appears to blend nearby squares, which would
cost four times the calls to copy.

**Tip when comparing on Windy:** set "Source:" under the forecast table to
UKV; it defaults to "meteoblue AI".
