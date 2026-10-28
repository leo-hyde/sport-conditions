# Backlog

Every feedback note and idea, and how far it's got. Claude updates this when
Leo says "check feedback". The newest is at the top of each section.

**States:** easy (clear and small, ready to build) · discuss (needs a chat,
or a change to SPEC.md, first) · later (agreed, but waiting) · done (listed
in CHANGELOG.md) · not doing (with the reason).

## To do

| Idea | From | State | Notes |
|---|---|---|---|
| Voice notes: stop the beeping | Leo, #5 | discuss | Android beeps each time listening restarts after a pause. The browser can't turn that off. The fix would be recording audio and sending it to a paid transcription service |
| Surf: wave size for each spot (for example Towan smaller than Fistral, behind the headland) | Leo, #7 | discuss | Now: the same open-sea forecast 2.5 km out, not adjusted for shelter. Could add a size factor for each spot. Surfline-level quality isn't possible from free data |
| Surf: drop the swell compass for each spot? | Leo, #6 | discuss | Leo says big swells wrap in anyway. Pulls against #7, which wants more spot detail |
| Overview across all sports: which sport, where, on which day | Leo, #4 | discuss | Not in SPEC.md, so it needs a spec. Loads both sports' forecasts, so more calls towards the daily limit |
| Automated tests of the rating rules | Claude, 23 Oct | easy | The next step for quality (ARCHITECTURE.md "Weak spots") |
| Check the Newquay surf spots' locations, directions and tide rules | Claude, 23 Oct | discuss | They came from Claude's general knowledge. Check the tide rules for Little Fistral and Lusty Glaze especially |
| Map: group nearby pins when zoomed out (clusters) | Leo, #9 | discuss | Not in SPEC.md. Would add a CDN library (Leaflet.markercluster); also replaces the older "Surf map: pins overlap" row below |
| Met Office forecast reads lower than Windy for the same hour (Fistral) | Leo, #12 | discuss | Needs a check against live data first: may be the model (Met Office vs Windy's default), gust vs mean wind, or height of the reading. Not a bug until compared |
| Surf map: pins overlap around Newquay | Claude, 23 Oct | later | Fine once you zoom in |
| Tides on the map, done better | Leo, 23 Oct | later | Tide labels on pins were too crowded, so I removed them. Arrows for tidal currents (like SailGrib WR) need a source of data |
| Send feedback straight to GitHub (Worker secrets) | Leo, 23 Oct | later | Built. Leo chose not to set up the secrets for now |
| Smaller header when the phone is on its side | Leo, 22 Oct | discuss | It works now, but the header fills the short screen |
| Other testers without GitHub accounts (through the Worker, with personal codes) | Leo, 22 Oct | later | After Leo has used feedback mode for a while |

## Done

| Idea | From | Done | Notes |
|---|---|---|---|
| Voice note text scrolls as you speak | Leo, #10 | 28 Oct | |
| Fold the feedback buttons away | Leo, #11 | 28 Oct | › tab; dragging them was left out |
| Map: a button to show where I am | Leo, #8 | 26 Oct | ◎ under the zoom buttons |
| Voice notes: a pause button | Leo, #5 | 26 Oct | The beeping is still in "To do" |
| Surfing, starting with the Newquay spots, linked to Surfline | Leo, #3 + 23 Oct | 23 Oct | SPEC.md version 1.3 |
| Map timeline: stay with the finger | Leo, 23 Oct | 23 Oct | On phones, a strip you swipe under a fixed marker |
| Tide rules you can edit for each site (for example not within 2 hours of low water) | Leo, 23 Oct | 23 Oct | |
| Reopen on the tab you left; a first visit lands on Overview by day | Leo, #1 | 22 Oct | |
| Finer finger control on the map timeline | Leo, #1 | 22 Oct | One hour for each 14px slide |
| Tide state on the map as you move through time | Leo, #1 | 22 Oct | Removed 23 Oct: too crowded (see "To do") |
| By hour: what sets the hours? The clock change? | Leo, #1 | 22 Oct | Answer: the flying day (sunrise to sunset, plus any extra time, in Settings), in UK clock time. So it follows the clock change |
| Does a note record every window visited? | Leo, #2 | 22 Oct | It didn't. Now it lists every place you visited |
| One-tap Send, and see what you've sent | Leo, #2 | 22 Oct | Your requests. Sending direct needs the Worker secrets |
| Voice notes cut off; screen going blank | Leo, #3 | 22 Oct | It keeps half-finished phrases, the screen stays on, and it carries on after the screen goes off. Leo to test again |
| Map grey dots | Leo, #1 | 22 Oct | No change: they fill with colour when you zoom in |
| Feedback mode (speak notes while testing) | Leo, 22 Oct | 22 Oct | SPEC.md version 1.2 |
| Clearer By hour; open on Overview by day | Leo, 22 Oct | 22 Oct | |
