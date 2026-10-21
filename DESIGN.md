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
| `--no` | #f3e3e3 | #33262a | 🔴 no (deliberately faint) |

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
  (speed only); "Best times" uses ranked window cards on `--surface-2`.
- **Map:** OpenTopoMap tiles (dimmed in dark mode), with a timeline card
  underneath: the big time label, day pills and a slider.

## References
- Apple Human Interface Guidelines: tap targets, hierarchy, legibility
- *Refactoring UI*: spacing, contrast, restraint
- WCAG 2.2: text contrast of at least 4.5:1, don't rely on colour alone
