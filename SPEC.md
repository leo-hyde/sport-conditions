# Sport Conditions: Product Spec

Status: **draft for Leo's review**. Once approved, Claude builds version 1 from this.

## The idea

One page that shows at a glance when conditions are good for each of my
sports, at each of my sites. It starts with paragliding.

## Key concepts

- **Sport:** has its own **speed rules** that apply to every site of that
  sport (wind speed isn't site-specific).
- **Site:** belongs to a sport. Has a name, a location and its own
  **direction rules** (which compass directions are good or OK).
- **Traffic light:** for each hour at each site,
  🟢 good · 🟡 OK · 🔴 no.

---

## Version 1

### 1. Site list with hourly traffic lights
- One row per site, showing coloured hourly blocks for **daylight hours,
  for today plus the next 2 days**.
- At the top, a summary of which sites have any 🟢 hours today and
  tomorrow.

### 2. How an hour gets its colour
Each hour checks three things. The overall colour is the **worst** of them.

| Check | 🟢 Good | 🟡 OK | 🔴 No |
|---|---|---|---|
| Wind direction | in the site's good directions | in the site's OK directions | anything else |
| Wind speed (mph) | 14–16 | 12–18 | outside 12–18 |
| Rain | dry | n/a | rain forecast |

**Gusts are shown but don't affect the colour** (for now).

Worked example: the wind is W (good) at 13 mph (OK), and it's dry (good),
so the hour is 🟡.

### 3. Hour details
Tap an hour to see wind speed, **gusts**, direction (with an arrow) and
rain, plus which check made it amber or red.

### 4. Add / edit / delete sites
- **Name**
- **Location:** search a place name, or paste coordinates
- **Wind directions:** a 16-point compass; tap each direction to cycle
  it through no → OK → good
- Saved in the browser, so sites stay on that device only (see *Later*).

### 5. Paragliding speed settings
A small settings panel holds the paragliding speed rules (good 14–16,
OK 12–18 mph), so you can tweak them in one place.

### 6. Starter sites

| Site | Good | OK | Source |
|---|---|---|---|
| Fistral (North & South) | W, WNW, NW | WSW, NNW | Leo |
| Perranporth | W, WNW | WSW, NW | Flybubble |
| St Agnes | N, NNW | NNE, NW | Flybubble |
| Chapel Porth | SW, WSW | – | Flybubble |
| Hale Towans / Black Cliff | NW, NNW | WNW | Flybubble |
| Carn Brea | NW, NNW | – | Flybubble |

(Flybubble's per-site speed ranges are ignored, since speed comes from
the sport settings.)

### How it's built
- **Plain HTML, CSS and JavaScript, no frameworks.** It's easy to read and
  learn from, and nothing needs installing.
- **Weather from [Open-Meteo](https://open-meteo.com):** free, no account,
  hourly wind speed, gusts, direction and rain, in mph.
- **Git:** every working step is saved as a snapshot.

### Build steps (each one ends with something you can see)
1. Show the hourly forecast for Fistral (numbers only).
2. Colour the hours using the rules above.
3. Show all starter sites with a summary.
4. Hour details on tap.
5. Add / edit / delete sites, with the compass picker.
6. Speed settings panel, plus tidying up the look.

---

## Later (not in version 1)

These are listed roughly in the order I'd suggest doing them. Each would get
its own short spec before building.

### A. Put it online and on your phone
- Host it free on **GitHub Pages** so it has a web address.
- Make it installable to your phone's home screen (a "PWA"), so it looks
  and feels like an app.
- *Why later:* it's easy, but it isn't worth doing until v1 is useful.

### B. Sync your sites between devices
- In v1, a site added on your laptop doesn't appear on your phone.
- Fix: save sites in a small online database with a simple sign-in.
- Stop-gap option: an export/import button (copy your sites as a file).

### C. Gusts in the traffic light
- Turn an hour 🔴 when the gusts are too strong, or when the gap between
  gusts and average wind is too big. You'd set the limits in sport settings.

### D. Thermals and cloud base
- Show how high the cloud base is and how strong thermals are likely
  to be (from Open-Meteo's boundary layer height, CAPE and cloud data).
- Probably a separate "XC potential" indicator rather than part of the
  basic traffic light.

### E. More sports
- Each sport gets its own rules and its own sites, using the same
  framework:
  - **Kitesurfing / windsurfing:** wind speed and direction (onshore or
    cross-shore), maybe tide.
  - **Surfing:** swell height, period and direction (Open-Meteo has a
    free marine forecast), with offshore or light wind as good.
- A sport switcher at the top, or a combined "what's best today?" view.

### F. Map view
- Sites on a map, coloured by today's best traffic light.
- Tap the map to drop a pin when adding a new site.

### G. Alerts
- "Tell me when Fistral is 🟢 for 3 or more hours this weekend": a phone
  notification or email. This needs (A) and (B) first.

### H. Better forecasts
- Compare two weather models side by side. When they disagree, the
  forecast is less certain.
- Show live readings from nearby weather stations, not just forecasts.

### I. More sites
- Bring in more sites from public sources. This needs permission
  or an open data source; Flybubble's list isn't a published API.

---

## Open questions
- None blocking v1. Leo to review the "Later" order.
