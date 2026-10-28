# Sport Conditions: Design Guide

How the app looks and feels. Claude follows this for every new screen or
feature. A design change goes in here first, then in the code.

Before designing a screen, read the playbook's `reference/design-method.md`.

**Style:** Mint (applied 28 Oct 2026; a candidate from the playbook's style library, inspired by Supabase's look via awesome-design-md, MIT; not affiliated). White and near-black with one emerald green. Font is still the device's own (Mint's Figtree not added: it would need Google Fonts or self-hosting).

## Inspiration
- **Windy** (a popular weather map site): modern, full of data but easy to
  read. Bold colours on calm backgrounds, and a map with a time slider. This
  is **the look we're aiming for**.
- **Flybubble** (a paragliding shop with a site guide): very usable site
  information. Keep how usable it is, but make it look modern.
- **XC Weather** (a wind forecast site): a good page for a single site. Avoid
  its dated look and its cluttered home page.

## Principles
1. **Glance first.** You should be able to answer "where can I fly, and
   when?" in under 2 seconds. Detail comes when you tap.
2. **Colour carries meaning.** Bright colours are kept for good and OK
   conditions. Everything else is calm and muted: the frame of the app, "no"
   hours and the past. That way the flyable hours stand out.
3. **Never rely on colour alone.** About 1 in 12 men are red–green colour-blind.
   Good and OK are bright and "no" is faint, so the ratings also differ in
   brightness. The details panel also uses words and the symbols ✓ ~ ✕.
4. **Phone first.** It's designed for a phone held in one hand on a hillside,
   then made bigger for desktop. Buttons are at least 44px tall.
5. **Follow the phone.** The light or dark theme comes from the device's own
   setting.

## Design tokens

These are the building blocks: named colours that the whole app uses. They're
defined in `:root` in style.css.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--bg` | #fafafa | #1c1c1c | page background |
| `--surface` | #ffffff | #202020 | cards, dialogs |
| `--surface-2` | #f6f6f6 | #2a2a2a | input boxes, inner panels |
| `--text` | #171717 | #ededed | main text |
| `--muted` | #5c5c5c | #9a9a9a | less important text |
| `--border` | #dfdfdf | #2e2e2e | dividing lines |
| `--accent` | #3ecf8e | #3ecf8e | buttons, selected pills, the card edge. Too pale for text on white |
| `--link` | #1a7f56 | #3ecf8e | green text: links, the chosen tab, chart lines |
| `--good` | #3ecf8e | #3ecf8e | 🟢 good (same green as `--accent`) |
| `--ok` | #ffdb13 | #ffdb13 | 🟡 OK |
| `--no` | #ededed | #333333 | no: a calm grey, so good and OK hours stand out |

- **Font:** the device's own font (SF Pro on Apple). Numbers use
  `tabular-nums` (every digit the same width) so they line up.
- **Text sizes:** 12 / 14 / 16 / 20 / 26px.
- **Spacing:** multiples of 4px.
- **Corners:** rounded by 8px for cards and dialogs, 6px for hour blocks.
- **Shadows:** soft and subtle, in the light theme only.

## Components (the parts of the screen)
- **Header:** the app name, "Updated 14:05", and refresh and settings buttons.
- **Tabs:** Overview · Sites · Map. A row of pill-shaped buttons that stays
  at the top as you scroll.
- **Hour block:** a rounded tile in the rating colour. It shows the hour, a
  wind arrow and the speed. Hours already over are the calm "no" grey, never a faded good or OK.
- **Cards:** one per site, on `--surface`, with the name and an edit button.
- **Dialogs** (pop-up panels): in the middle of the screen on desktop. On
  phones they slide up from the bottom (a "bottom sheet").
- **Map pins:** round, in the rating colour, with the wind arrow and speed
  inside and the site name underneath.
- **Compass picker:** a ring of 16 segments. Tap one to cycle it through
  no → OK → good.
- **Overview layouts:** pill buttons to switch (By day · By hour · Best times).
  - "By day" uses cells coloured by rating. "–" means no good or OK hours,
    "Over" means the day has finished, "No data" means no forecast arrived.
    The key under the headline says so. Words, not tide abbreviations: "High 05:56", "Big tides".
  - "By hour" uses small hour blocks. Only good and OK hours show the wind
    speed; "No" blocks are blank. Above them is a tinted **time strip**
    reading "8h 9h 10h…" (every other hour on phones). So you can't mix up
    times and speeds.
  - The page reopens on the tab you left. A first visit lands on the
    Overview, by day.
- **Map:** OpenTopoMap background (dimmed in dark mode). A timeline card sits
  underneath, with the time in large text, day labels and bars of hours.
  - On desktop, all 7 days fit and you drag along them.
  - **On phones it works like Windy:** a strip of 14px hours that you swipe
    sideways under a fixed `--accent` marker. The hour under the marker is
    the chosen time. Tapping an hour or a day jumps there.
  - Guide sites are small grey dots. Pill buttons switch to Windy's own
    animated wind map.
- **Mini compass:** a small ring of 16 wedges with "N" in the middle, next
  to each site's name.
- **Sport and forecast menus:** pill-shaped drop-down menus under the header.
  The sport shows its emoji (🪁 Parakiting).
- **Wind history chart:** one mph scale. Wind is a 2px `--accent` line. Gusts
  are orange dots with a ring the colour of the card. Faint bands behind show
  the good and OK ranges. Direction arrows run underneath. A reading above the
  chart follows your finger. There's always a table version too.
- **Tide line:** small muted text under each day's strip ("🌊 HW … · LW … ·
  Springs"). HW and LW mean high and low water.

- **Feedback mode buttons:** they float at the bottom right (above the tab bar
  on phones). There's a 56px round `--accent` 🎙 button, and 44px `--surface`
  ✎ and 📝 buttons. 📝 ("Your requests") shows a red count of notes not sent
  yet. The buttons only show in feedback mode.
- **Feedback bar:** fixed to the **top** of the screen, because the phone
  keyboard covers the bottom. It sits on `--surface` with a 2px `--accent`
  border. It shows a pulsing red dot and your words as you speak, or a text
  box. It has ⏸ (while speaking; becomes ▶ when paused, and the dot turns
  grey and stops), ✕ and **Send** (one tap).
- **"Show where I am":** a ◎ button in the map's own button style, under
  + and −. Your position is a blue (`#2563eb`) dot with a white ring, inside
  a faint blue circle showing how accurate it is. The ◎ pulses while
  searching.
- **Your requests:** a bottom sheet listing notes not sent yet (you can edit
  them, with "Send via GitHub") and sent notes, newest first. Each sent note
  says "✓ Saved on GitHub as #12" or "Opened on GitHub · Didn't create it?
  Send again".

- **Surfing:** the same hour blocks, pins and Overview, but showing **wave
  height in ft** instead of wind speed (the arrow shows the swell direction).
  - Site cards add a blue "Surfline ↗" tag.
  - The hour panel's tiles are Waves (with Surfline-style words: "waist to
    chest"), Period, Swell from, and Wind (marked "offshore").
  - The site form adds an **offshore wind compass** (wedges on or off) and a
    box for the Surfline link. Its main compass is called "Swell directions".
- **Tide rule** (site form, any sport): a drop-down menu ("Not near low
  water", "Only near high water"…) and "within [2] h". On cards it shows a
  short tag ("Avoid low ±2h").

## Phone layout (under 600px wide)
- Nothing may be wider than the screen, or phones zoom the whole page out.
  Rows of controls must wrap onto the next line.
- The tabs become a bar fixed to the bottom, with icons (📊 ⭐ 🗺️).
- The header is smaller. The Sport and Forecast menus take half the width each.
- On site cards, the day name sits above its strip, so the hours get the full
  width.
- The map fills most of the screen.

## Design review (21 October 2026)

What we checked: how quickly you can read it at a glance, what stands out
first, whether colour carries meaning, contrast, how easy it is to use with
one hand, and whether detail stays hidden until you ask for it.

| What we found | What we changed |
|---|---|
| No headline answer: you had to scan a grid to find when to go | A **"Next good session"** card at the top of the Overview (tap it to go to that site) |
| Red "No" cells took over, so good and OK didn't stand out; "No" text was too faint to read easily | **"No" is now a calm grey** with darker text (contrast about 5:1) |
| No colour key on the Overview | A **Good / OK / No key** under the headline |
| Site cards showed 7 days, so only one site fitted on a screen | Cards show **today and tomorrow**, with "Show all 7 days" (and a hint like "3h good later"), which opens the later days on every card; each card has a blue left edge and extra space below it |
| Phone Overview: names cut off, tide labels on every day, ":00" wasting space | Names wrap onto two lines; no tide labels on the Overview; short times ("8–11h") |
| Live airport wind looked like site pins | **Dark square LIVE tags** with a pointer, and a **map key** |
| Settings was one long list, with Save at the very bottom | Settings **in groups**; Save and Cancel always visible at the bottom |
| Phone dialogs didn't look like you could move them | Bottom sheets with a **grab handle**; they scroll inside |
| No sign that it was refreshing | The ↻ button **spins** while loading (it stays still if "reduce motion" is on) |

## References
- Apple Human Interface Guidelines (Apple's design advice): button sizes,
  what stands out first, how easy text is to read
- *Refactoring UI* (a book on interface design): spacing, contrast, restraint
- WCAG 2.2 (the web's accessibility standard): text contrast of at least
  4.5:1, and don't rely on colour alone
