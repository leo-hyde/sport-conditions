// The settings panel for the current sport: for parakiting, wind speed
// ranges and rain; for surfing, waves, period and wind; for both, the units
// and the daylight hours. Sections marked data-sport="…" show for that sport only.

const settingsForm = document.getElementById("settings-form");
let formUnit = "mph";  // the unit the form's speed boxes are currently in

function showUnitLabels() {
  document.querySelectorAll("#settings-form .unit-label").forEach(label => {
    label.textContent = UNITS[formUnit].label;
  });
}

// Changing the unit converts the speed boxes, so 14 mph becomes 23 km/h.
settingsForm.units.addEventListener("change", () => {
  const newUnit = settingsForm.units.value;
  for (const name of ["goodMin", "goodMax", "okMin", "okMax", "windLight", "windOk", "offshoreMax"]) {
    settingsForm[name].value = convertSpeed(Number(settingsForm[name].value), formUnit, newUnit);
  }
  formUnit = newUnit;
  showUnitLabels();
});

function openSettings() {
  document.getElementById("settings-title").textContent = `${currentSport().icon} ${currentSport().name} settings`;
  showSportSections();
  fillSettingsForm(state.settings);
  renderSyncBox();
  document.getElementById("feedback-switch").checked = feedbackOn();  // feedback.js
  document.getElementById("feedback-code").value = sendCode();
  document.getElementById("settings-error").hidden = true;
  document.getElementById("settings-dialog").showModal();
}

// Only the current sport's sections show. Hidden ones are also disabled,
// so their empty boxes don't stop the form saving.
function showSportSections() {
  settingsForm.querySelectorAll("[data-sport]").forEach(section => {
    const mine = section.dataset.sport === state.sport;
    section.hidden = !mine;
    section.querySelectorAll("input, select").forEach(input => { input.disabled = !mine; });
  });
}

function fillSettingsForm(settings) {
  settingsForm.units.value = settings.units;
  formUnit = settings.units;
  showUnitLabels();
  const fill = values => Object.entries(values).forEach(([name, value]) => { settingsForm[name].value = value; });
  if (state.sport === "surfing") {
    fill({
      waveGoodMin: settings.waveGood.min, waveGoodMax: settings.waveGood.max,
      waveOkMin: settings.waveOk.min, waveOkMax: settings.waveOk.max,
      periodGood: settings.periodGood, periodOk: settings.periodOk,
      windLight: settings.windLight, windOk: settings.windOk, offshoreMax: settings.offshoreMax,
    });
  } else {
    fill({
      goodMin: settings.speedGood.min, goodMax: settings.speedGood.max,
      okMin: settings.speedOk.min, okMax: settings.speedOk.max,
      rainCutoff: settings.rainCutoff,
    });
  }
  settingsForm.daylight.value = settings.daylight;
  settingsForm.extraMinutes.value = settings.extraMinutes;
}

settingsForm.addEventListener("submit", event => {
  event.preventDefault();  // stop the browser reloading the page
  const number = name => Number(settingsForm[name].value);
  const shared = {
    units: settingsForm.units.value,
    daylight: settingsForm.daylight.value,
    extraMinutes: number("extraMinutes"),
  };
  const settings = state.sport === "surfing"
    ? {
        ...shared,
        waveGood: { min: number("waveGoodMin"), max: number("waveGoodMax") },
        waveOk: { min: number("waveOkMin"), max: number("waveOkMax") },
        periodGood: number("periodGood"),
        periodOk: number("periodOk"),
        windLight: number("windLight"),
        windOk: number("windOk"),
        offshoreMax: number("offshoreMax"),
      }
    : {
        ...shared,
        speedGood: { min: number("goodMin"), max: number("goodMax") },
        speedOk: { min: number("okMin"), max: number("okMax") },
        rainCutoff: number("rainCutoff"),
      };

  const error = document.getElementById("settings-error");
  const ranges = state.sport === "surfing" ? [settings.waveGood, settings.waveOk] : [settings.speedGood, settings.speedOk];
  if (ranges.some(range => range.min > range.max)) {
    error.textContent = "Each range's first number must be smaller than its second.";
    error.hidden = false;
    return;
  }

  const unitChanged = settings.units !== state.settings.units;
  state.settings = settings;
  saveSettings(settings);
  document.getElementById("settings-dialog").close();
  if (unitChanged) {
    // Forecasts arrive in the chosen unit, so fetch them again.
    for (const id in comparisons) delete comparisons[id];
    refresh();
  } else {
    render();
  }
});

document.getElementById("reset-settings").addEventListener("click", () => {
  fillSettingsForm(SPORT_DEFAULTS[state.sport]);
});
