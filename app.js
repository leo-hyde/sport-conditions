// Step 1: show the hourly forecast for one site (Fistral), numbers only.

// The site we're showing. Later this will become a list of sites.
const site = {
  name: "Fistral",
  lat: 50.4167,
  lon: -5.1003,
};

// The 16 compass points, in order clockwise from North.
const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                 "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

// Turn a direction in degrees (0–360) into a compass point, e.g. 290 → "WNW".
// Each compass point covers 22.5 degrees (360 / 16).
function degreesToCompass(degrees) {
  const index = Math.round(degrees / 22.5) % 16;
  return COMPASS[index];
}

// Build the Open-Meteo web address asking for the data we need.
function forecastUrl(site) {
  const params = new URLSearchParams({
    latitude: site.lat,
    longitude: site.lon,
    hourly: "wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation,is_day",
    wind_speed_unit: "mph",
    timezone: "Europe/London",
    forecast_days: 3,
  });
  return "https://api.open-meteo.com/v1/forecast?" + params;
}

// Open-Meteo sends each value as a separate list (all the times, all the
// speeds, …). This joins them into one object per hour, which is easier to use.
function toHours(data) {
  const h = data.hourly;
  return h.time.map((time, i) => ({
    time: new Date(time),
    speed: Math.round(h.wind_speed_10m[i]),
    gusts: Math.round(h.wind_gusts_10m[i]),
    direction: degreesToCompass(h.wind_direction_10m[i]),
    rain: h.precipitation[i],
    isDaylight: h.is_day[i] === 1,
  }));
}

// Draw one table per day, showing daylight hours only.
function showForecast(hours) {
  const daylight = hours.filter(hour => hour.isDaylight);
  let html = "";
  let currentDay = "";

  for (const hour of daylight) {
    const day = hour.time.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });

    // A new day starts a new table.
    if (day !== currentDay) {
      if (currentDay !== "") html += "</table>";
      html += `<h3>${day}</h3>
        <table>
          <tr><th>Time</th><th>Wind (mph)</th><th>Gusts (mph)</th><th>Direction</th><th>Rain (mm)</th></tr>`;
      currentDay = day;
    }

    const time = hour.time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    html += `<tr>
      <td>${time}</td>
      <td>${hour.speed}</td>
      <td>${hour.gusts}</td>
      <td>${hour.direction}</td>
      <td>${hour.rain}</td>
    </tr>`;
  }
  html += "</table>";

  document.getElementById("forecast").innerHTML = html;
}

// Fetch the forecast, then show it. "async" lets us wait for the internet
// without freezing the page.
async function main() {
  const status = document.getElementById("status");
  try {
    const response = await fetch(forecastUrl(site));
    const data = await response.json();
    status.textContent = `Hourly forecast for ${site.name} (daylight hours)`;
    showForecast(toHours(data));
  } catch (error) {
    status.textContent = "Couldn't load the forecast: " + error.message;
  }
}

main();
