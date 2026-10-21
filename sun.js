// Sunrise, sunset and twilight times, worked out from the sun's position.
// These are the standard astronomy formulas (as used by the SunCalc library).
// "Civil twilight" is when the sun is 6° below the horizon: roughly first
// and last usable light. Its length changes with the season.

const RAD = Math.PI / 180;
const DAY_MS = 86400000;
const J1970 = 2440588;
const J2000 = 2451545;
const EARTH_TILT = RAD * 23.4397;

const toDays = date => date.valueOf() / DAY_MS - 0.5 + J1970 - J2000;
const fromJulian = j => new Date((j + 0.5 - J1970) * DAY_MS);

// Returns the sun times for one day at one place, as Date objects.
function sunTimes(date, lat, lon) {
  const lw = RAD * -lon;
  const phi = RAD * lat;
  const d = toDays(new Date(date + "T12:00:00Z"));
  const n = Math.round(d - 0.0009 - lw / (2 * Math.PI));
  const ds = 0.0009 + lw / (2 * Math.PI) + n;
  const M = RAD * (357.5291 + 0.98560028 * ds);
  const L = M + RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + RAD * 102.9372 + Math.PI;
  const dec = Math.asin(Math.sin(EARTH_TILT) * Math.sin(L));
  const noon = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);

  // When the sun is at a given angle (in degrees) below the horizon.
  const timesAt = angle => {
    const w = Math.acos((Math.sin(angle * RAD) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));
    const set = J2000 + (0.0009 + (w + lw) / (2 * Math.PI) + n) + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
    return { rise: fromJulian(noon - (set - noon)), set: fromJulian(set) };
  };

  const sun = timesAt(-0.833);  // sunrise/sunset: the sun's top edge on the horizon
  const civil = timesAt(-6);
  return { sunrise: sun.rise, sunset: sun.set, dawn: civil.rise, dusk: civil.set };
}

// A time as decimal hours in UK time, e.g. 07:45 → 7.75.
function ukHours(time) {
  const [h, m] = time.toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" }).split(":");
  return Number(h) + Number(m) / 60;
}

// "07:45" from 7.75.
function formatHours(hours) {
  const total = Math.round(hours * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// The flying window for a day, in decimal UK hours: from sunrise (or first
// light) minus the extra minutes, to sunset (or last light) plus them.
function flyingWindow(site, date, settings) {
  const times = sunTimes(date, site.lat, site.lon);
  const useTwilight = settings.daylight === "twilight";
  const extra = settings.extraMinutes / 60;
  return {
    start: ukHours(useTwilight ? times.dawn : times.sunrise) - extra,
    end: ukHours(useTwilight ? times.dusk : times.sunset) + extra,
    sunrise: ukHours(times.sunrise),
    sunset: ukHours(times.sunset),
  };
}
