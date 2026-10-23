// The settings panel for the current sport: speed ranges, rain cutoff, flying day
// (sunrise/sunset or twilight).

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
  for (const name of ["goodMin", "goodMax", "okMin", "okMax"]) {
    settingsForm[name].value = convertSpeed(Number(settingsForm[name].value), formUnit, newUnit);
  }
  formUnit = newUnit;
  showUnitLabels();
});

function openSettings() {
  document.getElementById("settings-title").textContent = `${currentSport().icon} ${currentSport().name} settings`;
  fillSettingsForm(state.settings);
  renderSyncBox();
  document.getElementById("feedback-switch").checked = feedbackOn();  // feedback.js
  document.getElementById("feedback-code").value = sendCode();
  document.getElementById("settings-error").hidden = true;
  document.getElementById("settings-dialog").showModal();
}

function fillSettingsForm(settings) {
  settingsForm.units.value = settings.units;
  formUnit = settings.units;
  showUnitLabels();
  settingsForm.goodMin.value = settings.speedGood.min;
  settingsForm.goodMax.value = settings.speedGood.max;
  settingsForm.okMin.value = settings.speedOk.min;
  settingsForm.okMax.value = settings.speedOk.max;
  settingsForm.rainCutoff.value = settings.rainCutoff;
  settingsForm.daylight.value = settings.daylight;
  settingsForm.extraMinutes.value = settings.extraMinutes;
}

settingsForm.addEventListener("submit", event => {
  event.preventDefault();  // stop the browser reloading the page
  const number = name => Number(settingsForm[name].value);
  const settings = {
    units: settingsForm.units.value,
    speedGood: { min: number("goodMin"), max: number("goodMax") },
    speedOk: { min: number("okMin"), max: number("okMax") },
    rainCutoff: number("rainCutoff"),
    daylight: settingsForm.daylight.value,
    extraMinutes: number("extraMinutes"),
  };

  const error = document.getElementById("settings-error");
  if (settings.speedGood.min > settings.speedGood.max || settings.speedOk.min > settings.speedOk.max) {
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
  fillSettingsForm(DEFAULT_SETTINGS);
});
