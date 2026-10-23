// Made by tools/build_sites.py from data/surf-spots.csv. Don't edit this file:
// edit the CSV and run the script again.

const SURF_SPOTS = [
  {"name": "Fistral North", "lat": 50.42, "lon": -5.101, "goodDirections": ["W", "WNW", "NW"], "okDirections": ["WSW", "NNW"], "offshore": ["E", "ESE", "SE"], "tideRule": {"mode": "avoid", "water": "low", "hours": 2.0}, "surfline": "", "beach": true, "starter": true},
  {"name": "Fistral South", "lat": 50.4125, "lon": -5.099, "goodDirections": ["W", "WNW", "NW"], "okDirections": ["WSW", "NNW"], "offshore": ["ESE", "SE", "SSE"], "tideRule": {"mode": "avoid", "water": "low", "hours": 2.0}, "surfline": "", "beach": true, "starter": true},
  {"name": "Little Fistral", "lat": 50.4235, "lon": -5.1005, "goodDirections": ["W", "WNW", "NW"], "okDirections": ["NNW"], "offshore": ["E", "ESE", "SE"], "tideRule": {"mode": "avoid", "water": "low", "hours": 2.0}, "surfline": "", "beach": true, "starter": true},
  {"name": "Towan", "lat": 50.4168, "lon": -5.085, "goodDirections": ["NW", "NNW", "N"], "okDirections": ["WNW"], "offshore": ["SSE", "S", "SSW", "SW"], "tideRule": {"mode": "avoid", "water": "low", "hours": 2.0}, "surfline": "", "beach": true, "starter": true},
  {"name": "Great Western", "lat": 50.416, "lon": -5.08, "goodDirections": ["NW", "NNW", "N"], "okDirections": ["WNW"], "offshore": ["SSE", "S", "SSW", "SW"], "tideRule": {"mode": "avoid", "water": "low", "hours": 2.0}, "surfline": "", "beach": true, "starter": true},
  {"name": "Tolcarne", "lat": 50.4165, "lon": -5.0745, "goodDirections": ["NW", "NNW", "N"], "okDirections": ["WNW"], "offshore": ["SSE", "S", "SSW", "SW"], "tideRule": {"mode": "avoid", "water": "low", "hours": 2.0}, "surfline": "", "beach": true, "starter": true},
  {"name": "Lusty Glaze", "lat": 50.42, "lon": -5.066, "goodDirections": ["NW", "WNW", "NNW"], "okDirections": ["W", "N"], "offshore": ["SE", "SSE", "S"], "tideRule": {"mode": "avoid", "water": "low", "hours": 2.0}, "surfline": "", "beach": true, "starter": true},
  {"name": "Porth", "lat": 50.426, "lon": -5.059, "goodDirections": ["NW", "WNW"], "okDirections": ["W", "NNW"], "offshore": ["E", "ESE", "SE"], "tideRule": {"mode": "avoid", "water": "low", "hours": 2.0}, "surfline": "", "beach": true, "starter": true},
  {"name": "Watergate Bay", "lat": 50.443, "lon": -5.045, "goodDirections": ["W", "WNW", "NW"], "okDirections": ["WSW", "NNW"], "offshore": ["E", "ESE", "SE"], "tideRule": null, "surfline": "", "beach": true, "starter": true},
  {"name": "Mawgan Porth", "lat": 50.465, "lon": -5.038, "goodDirections": ["W", "WNW", "NW"], "okDirections": ["WSW"], "offshore": ["E", "ESE", "SE"], "tideRule": {"mode": "avoid", "water": "low", "hours": 2.0}, "surfline": "", "beach": true, "starter": true},
  {"name": "Crantock", "lat": 50.406, "lon": -5.115, "goodDirections": ["NW", "WNW", "W"], "okDirections": ["NNW"], "offshore": ["SE", "SSE", "S"], "tideRule": {"mode": "avoid", "water": "low", "hours": 2.0}, "surfline": "", "beach": true, "starter": true},
  {"name": "Holywell Bay", "lat": 50.3925, "lon": -5.148, "goodDirections": ["W", "WNW", "NW"], "okDirections": ["WSW"], "offshore": ["E", "ESE", "SE"], "tideRule": {"mode": "avoid", "water": "low", "hours": 2.0}, "surfline": "", "beach": true, "starter": true}
];

// The spots you start with when you first choose surfing.
const SURF_STARTERS = SURF_SPOTS.filter(spot => spot.starter);
