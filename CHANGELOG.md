# What's changed

Sport Conditions is in **Beta**: it's still being tested and changes often,
so there are no version numbers. Git (the record of every saved change) also
has every change. Newest first.

## 28 October 2026
- **Design review fixes** (everything in the 28 Oct review, plus a deeper check):
  - **Green now only means "good".** Buttons and the selected pill are
    near-black (near-white in dark mode), so a button can't be mistaken for a
    good rating. On the Overview table, OK days are a softer yellow, so the
    good (green) days stand out first.
  - **Easier to read:** past hours' times are no longer faded, and the
    sunrise line on site cards is bigger and darker.
  - **Hour details has a ✕ at the top**, and every pop-up keeps its Close
    (or Cancel and Save) buttons in view as you scroll.
  - **Easier to tap:** buttons, dropdowns, map buttons, map switches, the
    tide line and the Surfline tag are all bigger on phones.
  - **Add a site:** the compass works with a keyboard too, latitude and
    longitude say what they are, and Cancel and Save stay in view.
  - **Plainer words:** "Time between waves", "smooth, glassy water", "over
    head height", "Waves from", and the tide in hour details now reads e.g.
    "Tide falling, 2.0 m below average sea level".
  - **Shorter Settings:** Sync, Feedback and Start again fold away; number
    boxes bring up the number keyboard.
  - **Map:** names no longer pile on top of each other (some hide until you
    zoom in), good sites sit on top, the wind streaks are fainter, the map
    switches remember your choice, and the key moved to the top right.
  - **When forecasts don't load,** the Overview now says so ("No forecasts
    loaded… tap ↻"), instead of "Nothing flyable in the next 7 days".
  - **Keyboard users** see a clear focus ring.
- **New look: Mint.** White and near-black with one fresh green, in light and dark. Buttons and the selected pill are green; green text is a darker green so it can be read. Corners are a little tighter. The wind rating colours are now Mint's green and yellow.
- **Voice notes scroll:** the words you speak now scroll up as you go, so you
  always see the newest. (Feedback #10.)
- **Hide the feedback buttons:** a small › tab folds the mic, pencil and notes
  buttons out of the way; ‹ brings them back. It remembers your choice.
  (Feedback #11.)
- **Clearer site cards (My sites):** cards show today and tomorrow, as before.
  "Show all 7 days" now opens the later days on every site at once, so you can
  compare them. Each site has a blue edge and more space under it so they read
  as separate places. (Design review, issue #13.)
- **Easier to tap on a phone:** the refresh and settings buttons, "By day /
  By hour", site names and stars are now all at least 44 pixels, the size a
  thumb can hit reliably. (Design review, issue #13.)
- **The two dropdowns no longer make iPhones zoom in** when you tap them, and
  screen readers now announce them ("Sport", "Forecast model").
- **Easier to read:** the "updated" line and other grey text are a little
  darker. The Overview heading now says "Overview", like its tab.
- **Plainer words:** tides now read "High 05:56 · Low 12:22 · Big tides"
  instead of "HW", "LW" and "Springs", and "Tide rising · high at 18:20".
  A line on My sites explains the small wind dial. The top line just says
  "Updated 17:27", and each site card says whether its numbers are mph or ft.
- **Clearer table marks:** hours that have already passed are grey instead of
  faded yellow or green. In the Overview table, "–" means no good hours,
  "Over" means the day has finished and "No data" means no forecast arrived;
  the key explains this. In dark mode the "No" cells show up better.
- **The Overview table shows a soft shadow at the edge** while there are
  more days to scroll to.

## 26 October 2026
- **"Show where I am" on the map:** tap ◎ under the + and − buttons. The map
  moves to you and shows a blue dot. Your phone asks for permission the first
  time. Your location stays on your phone. (Feedback #8.)
- **Pause voice notes:** while you speak a note, tap ⏸ to pause and ▶ to
  carry on. The words so far are kept. (Feedback #5.)

## 25 October 2026
- **Plainer wording** in the app's help text: the map, the wave settings,
  first and last light, and feedback. Nothing works differently.

## 23 October 2026
- **Surfing** 🏄: pick it in the sport menu. You get the 12 Newquay spots,
  rated good, OK or no. The rating looks at wave height (in feet), the time
  between waves (swell period), swell direction, wind (offshore or light) and
  tide. Each spot has a Surfline link. Surf settings (wave sizes, period,
  wind) are separate from parakiting's.
- **Tide rules for any site:** "not near low water", "only near high water"
  and so on, within as many hours as you choose. These replace "not near high
  tide".
- **The map timeline on phones** now swipes sideways under a fixed marker,
  like Windy.
- I removed the tide labels from the map: they were too crowded.

## 22 October 2026 (afternoon, from feedback #1–#3)
- **Sending feedback takes one tap**, and 📝 **Your requests** shows what
  you've sent, with links. With a send code (Settings → Feedback), notes go
  straight to GitHub with no extra steps.
- **Voice notes keep every word.** The screen stays on while you talk.
  Listening starts again if the screen goes off. A half-finished note comes
  back after you reload the page. Each note lists every place you visited
  while speaking.
- The page **reopens on the tab you left**. A first visit lands on
  Overview → By day.
- **Map timeline:** finer control with a finger (one hour for each small
  slide).
- **Tides on the map:** beach sites show the tide at the chosen time
  (↑ rising, ↓ falling, and its height).

## 22 October 2026
- **Feedback mode:** speak or type notes about the app while you use it.
  Then send them to GitHub in one go (Settings → Feedback).
- **Overview "By hour" is clearer.** Times sit on their own strip
  ("8h 9h…"), and only good and OK hours show a wind speed.
- The page always opens on **Overview → By day**. (I changed this back the
  same day: it now reopens where you left it.)

## 21 October 2026
- Versions 1 and 1.1: forecasts and good / OK / no ratings for your sites,
  5 forecast models, the Overview, site cards, a map with the site guide,
  live airport wind, animated wind flow, tides, sync (waiting for its
  storage to be set up), and a design review. SPEC.md has the full list.
