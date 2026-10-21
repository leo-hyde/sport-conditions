"""Check data/sites.csv for mistakes, then turn it into sites.js for the app.

Run from the project folder:   python3 tools/build_sites.py

Edit sites in data/sites.csv (it opens in Numbers or Excel). Directions are
16-point compass names separated by spaces, e.g. "W WNW NW".
"""

import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
CSV_PATH = ROOT / "data" / "sites.csv"
JS_PATH = ROOT / "sites.js"
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
    for column in ["not_high_tide", "coastal", "closed", "starter"]:
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
        for column, key in [("not_high_tide", "notHighTide"), ("coastal", "coastal"),
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


if __name__ == "__main__":
    main()
