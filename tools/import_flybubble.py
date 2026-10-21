"""Download Flybubble's site guide and merge it into data/sites.csv.

Run from the project folder:   python3 tools/import_flybubble.py

Sites already in sites.csv are kept as they are (so your own edits win);
only sites that aren't there yet are added. Then run tools/build_sites.py.
"""

import csv
import json
import urllib.request
from pathlib import Path

SOURCE_URL = "https://api.theparaglider.com/v1/weather/sites"
CSV_PATH = Path(__file__).parent.parent / "data" / "sites.csv"
COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
           "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
COLUMNS = ["name", "lat", "lon", "good", "ok", "not_high_tide", "coastal", "beach",
           "closed", "country", "club", "starter", "source", "notes"]


def directions(wind_dir, level):
    """Flybubble rates each of the 16 compass points 0 (no), 1 (OK) or 2 (good)."""
    return " ".join(point for point, value in zip(COMPASS, wind_dir) if value == level)


def main():
    with urllib.request.urlopen(SOURCE_URL) as response:
        sites = json.load(response)

    rows = []
    if CSV_PATH.exists():
        with CSV_PATH.open(newline="") as f:
            rows = list(csv.DictReader(f))
    known = {(row["name"].strip().lower(), row["country"]) for row in rows}

    added = 0
    for site in sites:
        key = (site["name"].strip().lower(), site.get("countryCode") or "")
        if key in known:
            continue
        rows.append({
            "name": site["name"].strip(),
            "lat": round(site["lat"], 5),
            "lon": round(site["lng"], 5),
            "good": directions(site["wind_dir"], 2),
            "ok": directions(site["wind_dir"], 1),
            "not_high_tide": "",
            "coastal": "yes" if site.get("coastal") == "1" else "",
            "beach": "",
            "closed": "yes" if site.get("closed") == "true" else "",
            "country": site.get("countryCode") or "",
            "club": site.get("clubName") or "",
            "starter": "",
            "source": "Flybubble",
            "notes": "",
        })
        known.add(key)
        added += 1

    with CSV_PATH.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Added {added} sites; {len(rows)} in {CSV_PATH.name}")


if __name__ == "__main__":
    main()
