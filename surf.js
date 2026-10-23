// Surfing: the surf settings, wave forecasts, and rating a surf hour.
// Waves come from Open-Meteo's free marine forecast. Surfline has no public
// API (and its terms forbid copying its forecasts), so we link to it instead.

// Surf settings: wave sizes in feet, like Surfline; wind speeds in the
// chosen unit, like parakiting.
const SURF_DEFAULTS = {
  units: "mph",
  waveGood: { min: 3, max: 6 },  // feet
  waveOk: { min: 2, max: 8 },
  periodGood: 10,  // seconds between waves, or more
  periodOk: 7,
  windLight: 6,  // any direction up to this is fine (glassy)
  windOk: 12,  // onshore or cross-shore up to this is OK
  offshoreMax: 25,  // offshore up to this is good
  daylight: "sun",
  extraMinutes: 0,
};
