"""Compare Windy's wind forecast with Open-Meteo's, model by model.

Usage: python3 tools/windy_compare.py <windy.json>

<windy.json> holds one entry per site: {"Fistral": {"lat": .., "lon": ..,
"windy": <what tools/windy_read.js returned>}, ...}. For each site this asks
Open-Meteo for the same models three times: Open-Meteo's default "land" square
(what the app uses), the square nearest the site, and the nearest sea square, and prints how far each is from
Windy on average (knots; + means Open-Meteo is higher). Three calls per site.
See specs/forecast-validation.md.
"""
import datetime
import json
import sys
import urllib.parse
import urllib.request

# Windy's name for each model -> Open-Meteo's
MODELS = {
    "UKV": "ukmo_uk_deterministic_2km",
    "ECMWF": "ecmwf_ifs025",
    "ICON-EU": "icon_eu",
    "AROME-HD": "meteofrance_arome_france_hd",
    "GFS": "gfs_seamless",
}
HOURS_AHEAD = 48  # compare the first two days, where UKV runs at 2 km


def windy_times(windy, today):
    """Windy's columns as datetimes: the first day's date, then hour by hour."""
    day_of_month = int(windy["firstDay"].split()[-1])
    day = next(today + datetime.timedelta(days=n) for n in range(-1, 3)
               if (today + datetime.timedelta(days=n)).day == day_of_month)
    times, previous = [], -1
    for hour in windy["hours"]:
        if hour <= previous:
            day += datetime.timedelta(days=1)
        times.append(datetime.datetime.combine(day, datetime.time(hour)))
        previous = hour
    return times


def open_meteo(lat, lon, cell):
    params = urllib.parse.urlencode({
        "latitude": lat, "longitude": lon,
        "hourly": "wind_speed_10m", "wind_speed_unit": "kn",
        "timezone": "Europe/London", "forecast_days": 4,
        "cell_selection": cell, "models": ",".join(MODELS.values()),
    })
    with urllib.request.urlopen("https://api.open-meteo.com/v1/forecast?" + params) as response:
        return json.load(response)


def main(path):
    sites = json.load(open(path))
    today = datetime.date.today()
    print("Average gap to Windy, knots (+ = Open-Meteo higher), first %d hours" % HOURS_AHEAD)
    print("%-14s %-9s %8s %8s %8s" % ("site", "model", "land", "nearest", "sea"))
    for name, site in sites.items():
        windy = site["windy"]
        times = windy_times(windy, today)
        start = times[0]
        cells = {}
        for cell in ("land", "nearest", "sea"):
            data = open_meteo(site["lat"], site["lon"], cell)
            hourly = data["hourly"]
            index = {t: i for i, t in enumerate(hourly["time"])}
            cells[cell] = (hourly, index, data["latitude"], data["longitude"])
        for model, om_name in MODELS.items():
            row = [name, model]
            gaps = {}
            for cell, (hourly, index, _, _) in cells.items():
                diffs = []
                for t, windy_value in zip(times, windy["wind"].get(model) or []):
                    if (t - start).total_seconds() > HOURS_AHEAD * 3600:
                        break
                    i = index.get(t.strftime("%Y-%m-%dT%H:%M"))
                    value = hourly.get("wind_speed_10m_" + om_name, [None])[i] if i is not None else None
                    if value is not None:
                        diffs.append(value - windy_value)
                gaps[cell] = sum(diffs) / len(diffs) if diffs else None
            print("%-14s %-9s %8s %8s %8s" % (name, model,
                  *("%+.1f" % gaps[c] if gaps[c] is not None else "n/a" for c in ("land", "nearest", "sea"))))
        for cell, (_, _, lat, lon) in cells.items():
            print("%-14s %s square at %.3f, %.3f" % ("", cell, lat, lon))


if __name__ == "__main__":
    main(sys.argv[1])
