// The settings panel: paragliding speed ranges, rain cutoff, flying day
// (sunrise/sunset or twilight) and the high tide buffer.

const settingsForm = document.getElementById("settings-form");

function openSettings() {
  fillSettingsForm(state.settings);
  document.getElementById("settings-error").hidden = true;
  document.getElementById("settings-dialog").showModal();
}

function fillSettingsForm(settings) {
  settingsForm.goodMin.value = settings.speedGood.min;
  settingsForm.goodMax.value = settings.speedGood.max;
  settingsForm.okMin.value = settings.speedOk.min;
  settingsForm.okMax.value = settings.speedOk.max;
  settingsForm.rainCutoff.value = settings.rainCutoff;
  settingsForm.daylight.value = settings.daylight;
  settingsForm.extraMinutes.value = settings.extraMinutes;
  settingsForm.highTideWindow.value = settings.highTideWindow;
}

settingsForm.addEventListener("submit", event => {
  event.preventDefault();  // stop the browser reloading the page
  const number = name => Number(settingsForm[name].value);
  const settings = {
    speedGood: { min: number("goodMin"), max: number("goodMax") },
    speedOk: { min: number("okMin"), max: number("okMax") },
    rainCutoff: number("rainCutoff"),
    daylight: settingsForm.daylight.value,
    extraMinutes: number("extraMinutes"),
    highTideWindow: number("highTideWindow"),
  };

  const error = document.getElementById("settings-error");
  if (settings.speedGood.min > settings.speedGood.max || settings.speedOk.min > settings.speedOk.max) {
    error.textContent = "Each range's first number must be smaller than its second.";
    error.hidden = false;
    return;
  }

  state.settings = settings;
  saveSettings(settings);
  document.getElementById("settings-dialog").close();
  render();
});

document.getElementById("reset-settings").addEventListener("click", () => {
  fillSettingsForm(DEFAULT_SETTINGS);
});
