# Design review, 28 Oct 2026 (after the Mint style)

Done by Claude in the built-in browser against the playbook's
`reference/ux-checklist.md`, on the Surfing sport with real forecasts.
Screens: Overview (by day, by hour), My sites, Map, hour details, Settings,
Add site. Phone width (375px) light and dark, plus one desktop look.
Measured with axe-core (an accessibility checker, loaded in the page),
element sizes and scroll widths. The playbook's `page-check.js` was **not**
run (no Node.js on the Mac). Leo picks which findings to fix.

**All fixed on 28 Oct 2026** (Leo asked for every finding to be fixed). What
was done, a deeper second check and its extra findings are in
specs/design-fixes-2026-10-28.md; the choices are in docs/decisions.md.

## Findings, most important first
1. **Past-hour times are too faint** (My sites): "08, 09…" on grey hours are
   3.0:1 light, 3.4:1 dark (needs 4.5:1). Cause: `.hour .time { opacity: .7 }`.
   About 200 items. Easy.
2. **Sunrise line is too small and faint** (My sites): "☀ 07:05–17:05 · waves
   in ft" is 10px at 4.1:1. Easy.
3. **Hour details can't be closed from the top**: Close is at the bottom of a
   944px scroll, with no ✕ or sticky bar (checklist: primary button always
   visible). Medium.
4. **Add site form**: Cancel/Save not sticky (form is 1249px); the two compass
   pickers have no name and no keyboard use (axe serious); the place search has
   no label; raw Latitude/Longitude boxes. Medium to large.
5. **Map**: the 12 Newquay pins overlap and their names collide at the first
   zoom (Little Fistral, Fistral South, Tolcarne unreadable); the wind-flow
   arrows make the map busy; zoom and locate buttons 30px, the three map
   checkboxes 18px. Medium to large.
6. **Small tap targets**: sport and forecast dropdowns 36px high; Edit,
   + Add site, Close, Cancel 34px; tide line 19px; Surfline tag 17px;
   Overview "By hour" cells 17×25px. Measured; By hour is dense by design.
7. **Words**: "Good period: at least (s)", "glassy", "overhead", "Swell from",
   "Tide rising (6.4 m)" shown twice in hour details; Latitude/Longitude.
   Small.
8. **Settings is long** (13 sections, about 1,900px); number boxes don't ask
   for the decimal keyboard. Small.
9. **Surf Overview is mostly yellow "OK"**: the OK wave range (2–8 ft) is wide, so
   the table shouts yellow (checklist: bright only for what matters).
   A product choice, not only design.
10. **Mint: the button green and the "good" green are the same**: a green
    button can look like a "good" rating.
11. **Tiny**: Overview "By day" table has an empty header cell (axe minor);
    the two dropdowns aren't inside a page landmark (axe moderate).

## Passed
Nothing wider than the screen at 375px; inputs 16px; every field except the
place search has a label; Settings has grouped sections and a sticky Save;
the hour dialog and settings are bottom sheets; live regions exist for toasts
and service notices; one `h1`; desktop layout fine; Overview/Map/Settings
have no contrast failures in either theme apart from items 1–2.

## Not checked
Keyboard focus rings; a screen reader; the feedback dialogs; Edit site;
tide chart popup; empty, loading and error states; Add site and Settings in
dark mode; desktop for every screen; `page-check.js`.
