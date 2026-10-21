// Wind speed units. Forecasts are fetched from Open-Meteo already in the
// chosen unit, so every forecast number in the app is in it. Airport reports
// come in knots, so those are converted.

const UNITS = {
  mph: { label: "mph", openMeteo: "mph", windy: "mph", perKnot: 1.15078 },
  kmh: { label: "km/h", openMeteo: "kmh", windy: "km/h", perKnot: 1.852 },
  knots: { label: "knots", openMeteo: "kn", windy: "kt", perKnot: 1 },
  ms: { label: "m/s", openMeteo: "ms", windy: "m/s", perKnot: 0.514444 },
};

// The chosen unit, e.g. { label: "mph", … }.
function unit() {
  return UNITS[state.settings.units] || UNITS.mph;
}

// A speed in knots (from an airport report) in the chosen unit.
function fromKnots(knots) {
  return Math.round(knots * unit().perKnot);
}

// Converts a speed between two units, e.g. when you change unit in settings.
function convertSpeed(value, fromUnit, toUnit) {
  return Math.round(value / UNITS[fromUnit].perKnot * UNITS[toUnit].perKnot);
}
