# Sport Conditions: Design Guide

How the app looks and feels. Claude follows this for every new screen or
feature. Change it here first, then in the code.

## Inspiration
- **Windy:** modern, data-rich but easy to read, bold colours on calm
  surfaces, a map with a time slider. This is **the look we're aiming for**.
- **Flybubble:** very usable site info. Keep the usability, modernise
  the look.
- **XC Weather:** a good single-site page. Avoid its dated visuals and its
  cluttered homepage.

## Principles
1. **Glance first.** "Where can I fly, and when?" should be answered in
   under 2 seconds. Detail comes on tap.
2. **Colour carries meaning.** Bright colours are kept for good and OK
   conditions. Everything else (chrome, "no" hours, the past) is calm and
   muted, so the flyable hours pop out.
3. **Never colour alone.** About 1 in 12 men are red–green colour-blind. Good
   and OK are bright and "no" is faint, so the ratings also differ in
   brightness, and the details panel uses words and ✓ ~ ✕ symbols.
4. **Phone first.** Designed for a phone in one hand on a hillside, then
   scaled up for desktop. Buttons are at least 44px tall.
5. **Follow the phone.** Light or dark theme comes from the device setting.

## Design tokens (the building blocks; defined in `:root` in style.css)

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--bg` | #eef1f5 | #0e1116 | page background |
| `--surface` | #ffffff | #171b22 | cards, dialogs |
| `--surface-2` | #f4f6f9 | #202631 | inputs, inner panels |
| `--text` | #111827 | #e8ecf2 | main text |
| `--muted` | #6b7280 | #98a2b3 | secondary text |
| `--border` | #e3e7ee | #2a313c | dividers |
| `--accent` | #2563eb | #5b8cff | buttons, active tab, links |
| `--good` | #22c55e | #2fd36b | 🟢 good |
| `--ok` | #fbbf24 | #f5c04a | 🟡 OK |
| `--no` | #eceff3 | #222833 | no: a calm grey, so good and OK hours stand out |

- **Font:** the device's system font (SF Pro on Apple). Numbers use
  `tabular-nums` so they line up.
- **Type sizes:** 12 / 14 / 16 / 20 / 26px.
- **Spacing:** multiples of 4px.
- **Corners:** 14px for cards and dialogs, 6px for hour blocks.
- **Shadows:** soft and subtle, light theme only.

## Components
- **Header:** app name, "Updated 14:05", refresh and settings buttons.
- **Tabs:** Overview · Sites · Map. A pill-style segmented control, sticky
  at the top.
- **Hour block:** a rounded tile in the rating colour, showing the hour,
  a wind arrow and speed. Past hours are faded to 35%.
- **Cards:** one per site, on `--surface`, with the name and an edit button.
- **Dialogs:** centred on desktop; a bottom sheet on phones.
- **Map pins:** round, in the rating colour, with the wind arrow and speed
  inside and the site name underneath.
- **Compass picker:** a 16-segment ring; tap to cycle no → OK → good.
- **Overview layouts:** a pill switcher (By day · By hour · Best times).
  "By day" uses rating-coloured cells; "By hour" uses compact hour blocks
  with the wind speed shown only on good and OK hours ("No" blocks are
  blank), under a tinted **time strip** reading "8h 9h 10h…" (every other
  hour on phones), so times and speeds can't be confused. The page reopens
  on the tab you left; a first visit lands on the Overview, by day.
- **Map:** OpenTopoMap tiles (dimmed in dark mode), with a timeline card
  underneath: the big time label, day labels and hour bars. On desktop all 7
  days fit and you drag along them. **On phones it's Windy's pattern:** a strip
  of 14px hours that swipes sideways under a fixed `--accent` marker; the hour
  under the marker is the chosen time; tapping an hour or a day jumps there. Guide sites are
  small grey dots. A pill switcher swaps to Windy's embedded animated
  wind map.
- **Mini compass:** a small 16-wedge ring with "N" in the middle, next to
  each site's name.
- **Sport and forecast pickers:** pill-shaped dropdowns under the header;
  the sport shows its emoji (🪁 Parakiting).
- **Wind history chart:** one mph axis; wind is a 2px `--accent` line, gusts
  are orange dots with a surface ring; good/OK ranges are faint bands behind;
  direction arrows run underneath. A readout above follows your finger, and
  there's always a table view.
- **Tide line:** small muted text under each day's strip ("🌊 HW … · LW … ·
  Springs").

- **Feedback mode buttons:** floating, bottom right (above the tab bar on
  phones): a 56px round `--accent` 🎙 button, and 44px `--surface` ✎ and 📝
  buttons; 📝 ("Your requests") shows a red count of notes not sent yet.
  Only shown in feedback mode.
- **Feedback bar:** fixed to the **top** of the screen (the phone keyboard
  covers the bottom), on `--surface` with a 2px `--accent` border: a pulsing
  red dot and the words as you speak, or a text box; ✕ and **Send** (one tap).
- **Your requests:** a bottom sheet listing notes not sent yet (editable, with
  "Send via GitHub") and sent notes, newest first, each with "✓ Saved on
  GitHub as #12" or "Opened on GitHub · Didn't create it? Send again".

## Phone layout (under 600px wide)
- Nothing may be wider than the screen, or phones zoom the whole page out.
  Rows of controls must wrap.
- Tabs become a bar fixed to the bottom, with icons (📊 ⭐ 🗺️).
- A smaller header; the Sport and Forecast pickers take half the width each.
- On site cards the day name sits above its strip, so hours get the full width.
- The map fills most of the screen.

## UX review (21 October 2026)

What we checked: glanceability, hierarchy, colour carrying meaning,
contrast, phone ergonomics and progressive disclosure.

| Finding | Change |
|---|---|
| No headline answer: you had to scan a grid to find when to go | **"Next good session"** card at the top of the Overview (tap → that site) |
| Red "No" cells dominated, so good/OK didn't pop; "No" text failed contrast | **"No" is now calm grey** with darker text (≈5:1 contrast) |
| No colour key on the Overview | A **Good / OK / No key** under the headline |
| Site cards showed 7 days, so one site per screen | Cards show **today and tomorrow**; "Show all 7 days" (with "3h good later" hint) |
| Phone Overview: names cut off, tide labels on every day, ":00" wasted space | Names wrap; tide labels removed from the Overview; compact times ("8–11h") |
| Live airport wind looked like site pins | **Dark square LIVE tags** with a pointer; a **map key** |
| Settings was one long list, with Save at the very bottom | **Grouped sections**; Save/Cancel always visible at the bottom |
| Phone dialogs had no affordance | Bottom sheets with a **grab handle**; they scroll inside |
| No feedback while refreshing | The ↻ button **spins** while loading (still if "reduce motion" is on) |

## References
- Apple Human Interface Guidelines: tap targets, hierarchy, legibility
- *Refactoring UI*: spacing, contrast, restraint
- WCAG 2.2: text contrast of at least 4.5:1, don't rely on colour alone
