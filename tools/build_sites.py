"""Check the site guides for mistakes, then turn them into JavaScript for the app:
  data/sites.csv       → sites.js       (parakiting and flying sites)
  data/surf-spots.csv  → surfSpots.js   (surf spots)

Run from the project folder:   python3 tools/build_sites.py

Edit sites in data/sites.csv (it opens in Numbers or Excel). Directions are
16-point compass names separated by spaces, e.g. "W WNW NW". Yes/no columns
are "yes" or blank:
  coastal  - by the sea (from Flybubble)
  beach    - on or right next to a beach, so tide times matter
  starter  - one of the sites a new device starts with
Surf spots: swell_good / swell_ok are swell directions, offshore is the
wind directions that blow offshore there, tide is blank (any tide), "not low",
"not high", "only low" or "only high", with tide_hours either side, and
surfline is the spot's Surfline page address (optional).
On GitHub this runs automatically whenever either CSV changes
(.github/workflows/site-guide.yml).
"""

import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
CSV_PATH = ROOT / "data" / "sites.csv"
JS_PATH = ROOT / "sites.js"
SURF_CSV_PATH = ROOT / "data" / "surf-spots.csv"
SURF_JS_PATH = ROOT / "surfSpots.js"
TIDE_RULES = {"": None, "not low": ("avoid", "low"), "not high": ("avoid", "high"),
              "only low": ("only", "low"), "only high": ("only", "high")}
COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
           "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]


def check(row, line):
    """Returns a list of problems with one row (empty if it's fine)."""
    problems = []
    if not row["name"].strip():
        problems.append("missing name")
    try:
        if not -90 <= float(row["lat"]) <= 90:
            problems.append(f"latitude {row['lat']} out of range")
        if not -180 <= float(row["lon"]) <= 180:
            problems.append(f"longitude {row['lon']} out of range")
    except ValueError:
        problems.append("latitude/longitude isn't a number")
    good, ok = row["good"].split(), row["ok"].split()
    for point in good + ok:
        if point not in COMPASS:
            problems.append(f"'{point}' isn't a compass point")
    if set(good) & set(ok):
        problems.append(f"{' '.join(set(good) & set(ok))} is both good and OK")
    for column in ["not_high_tide", "coastal", "beach", "closed", "starter"]:
        if row[column] not in ("", "yes"):
            problems.append(f"{column} should be 'yes' or blank, not '{row[column]}'")
    return [f"line {line} ({row['name'] or '?'}): {problem}" for problem in problems]


def main():
    with CSV_PATH.open(newline="") as f:
        rows = list(csv.DictReader(f))

    problems, warnings, seen = [], [], {}
    for line, row in enumerate(rows, start=2):  # line 1 is the header
        problems += check(row, line)
        key = (row["name"].strip().lower(), row["country"])
        if key in seen:
            problems.append(f"line {line} ({row['name']}): duplicate of line {seen[key]}")
        seen[key] = line
        if not row["good"].split() and not row["ok"].split():
            warnings.append(f"line {line} ({row['name']}): no wind directions set")

    if problems:
        print(f"Found {len(problems)} problem(s); sites.js was NOT updated:")
        print("\n".join("  " + p for p in problems))
        sys.exit(1)

    sites = []
    for row in rows:
        site = {
            "name": row["name"].strip(),
            "lat": float(row["lat"]),
            "lon": float(row["lon"]),
            "goodDirections": row["good"].split(),
            "okDirections": row["ok"].split(),
            "country": row["country"],
        }
        for column, key in [("not_high_tide", "notHighTide"), ("coastal", "coastal"), ("beach", "beach"),
                            ("closed", "closed"), ("starter", "starter")]:
            if row[column] == "yes":
                site[key] = True
        sites.append(site)

    lines = ",\n".join("  " + json.dumps(site, ensure_ascii=False) for site in sites)
    JS_PATH.write_text(
        "// Made by tools/build_sites.py from data/sites.csv. Don't edit this file:\n"
        "// edit the CSV and run the script again.\n\n"
        f"const SITE_LIBRARY = [\n{lines}\n];\n\n"
        "// The sites you start with (marked 'starter' in the CSV).\n"
        "const STARTER_SITES = SITE_LIBRARY.filter(site => site.starter);\n"
    )
    print(f"OK: {len(sites)} sites written to sites.js "
          f"({sum('starter' in s for s in sites)} starter, {len(warnings)} with no directions)")


def check_surf(row, line):
    """Returns a list of problems with one surf spot (empty if it's fine)."""
    problems = []
    if not row["name"].strip():
        problems.append("missing name")
    try:
        if not (-90 <= float(row["lat"]) <= 90 and -180 <= float(row["lon"]) <= 180):
            problems.append("latitude/longitude out of range")
    except ValueError:
        problems.append("latitude/longitude isn't a number")
    for column in ["swell_good", "swell_ok", "offshore"]:
        for point in row[column].split():
            if point not in COMPASS:
                problems.append(f"{column}: '{point}' isn't a compass point")
    if set(row["swell_good"].split()) & set(row["swell_ok"].split()):
        problems.append("a swell direction is both good and OK")
    if not row["swell_good"].split():
        problems.append("no good swell directions")
    if row["tide"] not in TIDE_RULES:
        problems.append(f"tide should be blank, 'not low', 'not high', 'only low' or 'only high', not '{row['tide']}'")
    elif row["tide"]:
        try:
            if not 0 < float(row["tide_hours"]) <= 6:
                problems.append("tide_hours should be between 0 and 6")
        except ValueError:
            problems.append("tide_hours should be a number of hours, e.g. 2")
    if row["surfline"] and not row["surfline"].startswith("https://www.surfline.com/"):
        problems.append("surfline should be a https://www.surfline.com/… address")
    if row["starter"] not in ("", "yes"):
        problems.append(f"starter should be 'yes' or blank, not '{row['starter']}'")
    return [f"surf-spots.csv line {line} ({row['name'] or '?'}): {problem}" for problem in problems]


def build_surf_spots():
    with SURF_CSV_PATH.open(newline="") as f:
        rows = list(csv.DictReader(f))
    problems = [p for line, row in enumerate(rows, start=2) for p in check_surf(row, line)]
    if problems:
        print(f"Found {len(problems)} problem(s); surfSpots.js was NOT updated:")
        print("\n".join("  " + p for p in problems))
        sys.exit(1)

    spots = []
    for row in rows:
        rule = TIDE_RULES[row["tide"]]
        spot = {
            "name": row["name"].strip(),
            "lat": float(row["lat"]),
            "lon": float(row["lon"]),
            "goodDirections": row["swell_good"].split(),  # swell directions
            "okDirections": row["swell_ok"].split(),
            "offshore": row["offshore"].split(),  # wind directions that blow offshore
            "tideRule": {"mode": rule[0], "water": rule[1], "hours": float(row["tide_hours"])} if rule else None,
            "surfline": row["surfline"],
            "beach": True,
        }
        if row["starter"] == "yes":
            spot["starter"] = True
        spots.append(spot)

    lines = ",\n".join("  " + json.dumps(spot, ensure_ascii=False) for spot in spots)
    SURF_JS_PATH.write_text(
        "// Made by tools/build_sites.py from data/surf-spots.csv. Don't edit this file:\n"
        "// edit the CSV and run the script again.\n\n"
        f"const SURF_SPOTS = [\n{lines}\n];\n\n"
        "// The spots you start with when you first choose surfing.\n"
        "const SURF_STARTERS = SURF_SPOTS.filter(spot => spot.starter);\n"
    )
    print(f"OK: {len(spots)} surf spots written to surfSpots.js")


if __name__ == "__main__":
    main()
    build_surf_spots()
