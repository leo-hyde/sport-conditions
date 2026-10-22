// Feedback mode: speak (or type) notes about the app while you use it, then
// send them all to GitHub as one Issue for Claude to work through.
// Turned on in Settings → Feedback, or by opening the page with ?feedback=on.

const FEEDBACK_REPO = "leo-hyde/sport-conditions";
const APP_STAGE = "Beta";  // no version numbers yet: see CHANGELOG.md
const MAX_URL_LENGTH = 7000;  // longer GitHub links can fail, so big batches are split

const feedbackTools = document.getElementById("feedback-tools");
const feedbackBar = document.getElementById("feedback-bar");
const feedbackText = document.getElementById("feedback-text");
const feedbackInput = document.getElementById("feedback-input");
const feedbackDialog = document.getElementById("feedback-dialog");

// The browser's speech-to-text ("speech recognition"). Chrome and Safari have
// it; some browsers don't, and then the ✎ button lets you type instead.
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let notes = loadSaved("sc.feedbackNotes", []);  // [{ text, context, sent }]
let listening = false;  // true from 🎙 until Done or ✕
let listener = null;  // the speech recognition currently running
let heard = "";  // words finished so far in this note

function feedbackOn() {
  return loadSaved("sc.feedback", false);
}

function setFeedbackMode(on) {
  save("sc.feedback", on);
  renderFeedbackTools();

// A note you were in the middle of when the page closed comes back to finish.
// (Once the whole page has loaded, as it needs app.js.)
addEventListener("load", () => {
  const draft = loadSaved("sc.feedbackDraft", "");
  if (draft && feedbackOn()) showBar("typing", draft);
});
}

function saveNotes() {
  save("sc.feedbackNotes", notes);
  renderFeedbackTools();

// A note you were in the middle of when the page closed comes back to finish.
// (Once the whole page has loaded, as it needs app.js.)
addEventListener("load", () => {
  const draft = loadSaved("sc.feedbackDraft", "");
  if (draft && feedbackOn()) showBar("typing", draft);
});
}

// ---------- The floating buttons ----------

function renderFeedbackTools() {
  feedbackTools.hidden = !feedbackOn();
  document.body.classList.toggle("feedback-on", feedbackOn());
  document.getElementById("feedback-mic").hidden = !Recognition;
  const count = notes.filter(note => !note.sent).length;
  document.getElementById("feedback-count").textContent = count;
  document.getElementById("feedback-count").hidden = count === 0;
}

// While a dialog is open, the browser ignores taps outside it. So the
// feedback buttons move into the open dialog, and back out when it closes.
function placeFeedbackTools() {
  const open = [...document.querySelectorAll("dialog[open]")].pop();
  const home = open && open !== feedbackDialog ? open : document.body;
  if (feedbackTools.parentElement !== home) home.appendChild(feedbackTools);
}
new MutationObserver(placeFeedbackTools).observe(document.body,
  { subtree: true, attributes: true, attributeFilter: ["open"] });

// ---------- Speaking a note ----------

let places = [];  // the places you visit while making a note
let wakeLock = null;  // keeps the screen on while listening

function startListening() {
  heard = "";
  places = [];
  notePlace();
  listening = true;
  showBar("listening");
  keepScreenOn(true);
  listenOnce();
}

// Phones stop listening after a pause, so we start again until you tap
// Done. (Listening one phrase at a time also avoids Android repeating words.)
function listenOnce() {
  if (!listening || document.hidden) return;  // stopped, or the screen is off: wait
  const recognition = new Recognition();
  listener = recognition;
  recognition.lang = "en-GB";
  recognition.interimResults = true;  // show words while you're still speaking
  recognition.onresult = event => {
    const result = event.results[0];
    if (result.isFinal) {
      heard = (heard + " " + result[0].transcript).trim();
      showWords(heard);
    } else {
      showWords((heard + " " + result[0].transcript).trim());
    }
  };
  recognition.onerror = event => {
    // A pause, or the phone switched the screen off: keep going.
    if (event.error === "no-speech" || event.error === "aborted" || document.hidden) return;
    // Anything else (microphone blocked, no internet…): switch to typing,
    // keeping every word heard so far.
    const sofar = feedbackText.textContent;
    stopListening();
    showBar("typing", sofar);
    feedbackInput.placeholder = event.error === "not-allowed"
      ? "Microphone blocked: type, or allow it in the browser settings"
      : "Couldn't listen: type your note instead";
  };
  recognition.onend = () => {
    if (listening && listener === recognition) listenOnce();  // still listening: carry on
  };
  try {
    recognition.start();
  } catch {
    // Already starting: the next "end" tries again.
  }
}

// The words so far, on screen and saved, so nothing is lost if the page
// is closed or reloaded before you tap Done.
function showWords(text) {
  feedbackText.textContent = text;
  save("sc.feedbackDraft", text);
}

// Coming back to the page (e.g. the screen went off): listen again.
document.addEventListener("visibilitychange", () => {
  if (document.hidden || !listening) return;
  heard = feedbackText.textContent;  // keep any half-finished phrase
  if (listener) listener.abort();  // the old one may be stuck; start afresh
  listener = null;
  keepScreenOn(true);  // the phone drops this while the page is hidden
  listenOnce();
});

function stopListening() {
  listening = false;
  if (listener) listener.abort();
  listener = null;
  keepScreenOn(false);
}

// A "wake lock" stops the screen dimming and switching off while you talk.
// Not every browser has it, so failures are ignored.
async function keepScreenOn(on) {
  try {
    if (on && navigator.wakeLock) wakeLock = await navigator.wakeLock.request("screen");
    if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch {
    wakeLock = null;
  }
}

// ---------- The bar at the top of the screen ----------

// "listening" shows the words as you speak; "typing" shows a text box
// (at the top, so the keyboard doesn't cover it).
function showBar(mode, text = "") {
  feedbackBar.hidden = false;
  feedbackBar.dataset.mode = mode;
  feedbackText.textContent = mode === "listening" ? text : "";
  feedbackInput.value = mode === "typing" ? text : "";
  if (mode === "typing") {
    if (places.length === 0) notePlace();
    feedbackInput.focus();
  }
}

function hideBar() {
  stopListening();
  feedbackBar.hidden = true;
  feedbackInput.blur();  // closes the phone's keyboard
  save("sc.feedbackDraft", "");
}

function finishNote() {
  // Everything on screen, including a phrase the phone hasn't finished with.
  const text = (feedbackBar.dataset.mode === "typing" ? feedbackInput.value : feedbackText.textContent).trim();
  notePlace();
  hideBar();
  if (!text) return;
  notes.push({ text, context: feedbackContext(), sent: false });
  saveNotes();
  const count = notes.filter(note => !note.sent).length;
  showToast(`Note ${count} saved`, "Undo", () => {
    notes.pop();
    saveNotes();
  });
}

// Typing into the bar also saves a draft.
feedbackInput.addEventListener("input", () => save("sc.feedbackDraft", feedbackInput.value));

// ---------- Where you were ----------

// A short name for where you are now, e.g. "map · panel: Fistral, Today 10:00".
function currentPlace() {
  const open = [...document.querySelectorAll("dialog[open]")].pop();
  const panel = open && open !== feedbackDialog
    ? (open.dataset.feedbackLabel || open.querySelector("h2")?.textContent.trim() || open.id) : "";
  const tab = state.view + (state.view === "overview" ? ` (${state.layout === "days" ? "by day" : "by hour"})` : "");
  return [tab, panel && `panel: ${panel}`, state.view === "map" && state.mapTime && `map time: ${state.mapTime}`]
    .filter(Boolean).join(" · ");
}

// Adds where you are to the note's list of places, if it's somewhere new.
function notePlace() {
  const place = currentPlace();
  if (places[places.length - 1] !== place) places.push(place);
}

// While you're making a note, every tap may take you somewhere new.
document.addEventListener("click", () => {
  if (!feedbackBar.hidden) setTimeout(notePlace, 300);  // after the tap has done its work
});

// When and where you made the note, so it still makes sense later.
function feedbackContext() {
  const theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  return {
    time: new Date().toLocaleString("en-GB", { timeZone: "Europe/London" }),
    places: [...places],  // e.g. ["overview (by day)", "map · map time: 2026-10-22T14"]
    screen: `${innerWidth}×${innerHeight}, ${theme}`,
    browser: navigator.userAgent.replace(/^Mozilla\/5.0 /, ""),
    forecast: MODELS.find(model => model.id === state.model).name,
  };
}

// "22/10/2026, 12:37 · overview (by day) → map · 360×669, dark".
// (Notes saved before places were recorded have tab and panel instead.)
function contextLine(context) {
  const where = context.places
    ? context.places.join(" → ")
    : [context.tab, context.panel && `panel: ${context.panel}`].filter(Boolean).join(" · ");
  return [context.time, where, context.screen].filter(Boolean).join(" · ");
}

// ---------- Reviewing and sending ----------

function openFeedbackDialog() {
  renderNotesList();
  if (!feedbackDialog.open) feedbackDialog.showModal();
}

function renderNotesList() {
  const unsent = notes.filter(note => !note.sent);
  const list = document.getElementById("feedback-list");
  list.innerHTML = unsent.length === 0
    ? '<p class="muted">No notes yet. Tap 🎙 and say what you\'d change, wherever you are in the app.</p>'
    : unsent.map(note => {
        const index = notes.indexOf(note);
        return `<div class="feedback-note">
          <textarea data-note="${index}" rows="2" aria-label="Note ${index + 1}">${esc(note.text)}</textarea>
          <div class="feedback-note-foot">
            <small class="muted">${esc(contextLine(note.context))}</small>
            <button type="button" class="btn small ghost danger" data-delete-note="${index}">Delete</button>
          </div>
        </div>`;
      }).join("");
  document.getElementById("feedback-send").disabled = unsent.length === 0;
  document.getElementById("feedback-sent-box").hidden = !notes.some(note => note.sent);
}

// The GitHub "new issue" page, filled in with as many notes as fit in one link.
function issueLink(batch) {
  const first = batch[0].context;
  const body = batch.map((note, i) => `### ${i + 1}. ${note.text}\n<sub>${contextLine(note.context)}</sub>`).join("\n\n")
    + `\n\n---\n${APP_STAGE} · ${first.forecast} forecast · ${first.browser}`;
  const params = new URLSearchParams({
    title: `Feedback: ${batch.length} note${batch.length === 1 ? "" : "s"} (${first.time.slice(0, 10)})`,
    body,
    labels: "feedback",
  });
  return `https://github.com/${FEEDBACK_REPO}/issues/new?${params}`;
}

function sendNotes() {
  const unsent = notes.filter(note => !note.sent);
  // Add notes until the link would get too long.
  let batch = [];
  for (const note of unsent) {
    if (batch.length > 0 && issueLink([...batch, note]).length > MAX_URL_LENGTH) break;
    batch.push(note);
  }
  window.open(issueLink(batch), "_blank");
  batch.forEach(note => { note.sent = true; });
  saveNotes();
  renderNotesList();
  const left = unsent.length - batch.length;
  document.getElementById("feedback-sent-msg").textContent =
    `Opened GitHub with ${batch.length} note${batch.length === 1 ? "" : "s"}: tap "Create" there.` +
    (left > 0 ? ` ${left} more to send: tap Send again.` : "");
}

// ---------- Buttons ----------

document.getElementById("feedback-mic").addEventListener("click", startListening);
document.getElementById("feedback-type").addEventListener("click", () => showBar("typing"));
document.getElementById("feedback-open").addEventListener("click", openFeedbackDialog);
document.getElementById("feedback-done").addEventListener("click", finishNote);
document.getElementById("feedback-cancel").addEventListener("click", hideBar);
document.getElementById("feedback-send").addEventListener("click", sendNotes);
feedbackInput.addEventListener("keydown", event => {
  if (event.key === "Enter") finishNote();
});

document.getElementById("feedback-list").addEventListener("input", event => {
  const box = event.target.closest("[data-note]");
  if (!box) return;
  notes[box.dataset.note].text = box.value;
  save("sc.feedbackNotes", notes);
});
document.getElementById("feedback-list").addEventListener("click", event => {
  const button = event.target.closest("[data-delete-note]");
  if (!button) return;
  notes.splice(Number(button.dataset.deleteNote), 1);
  saveNotes();
  renderNotesList();
});
// If GitHub didn't work out, put the sent notes back in the list.
document.getElementById("feedback-resend").addEventListener("click", () => {
  notes.forEach(note => { note.sent = false; });
  saveNotes();
  renderNotesList();
});
document.getElementById("feedback-clear").addEventListener("click", () => {
  notes = notes.filter(note => !note.sent);
  saveNotes();
  renderNotesList();
});

// The switch in Settings takes effect straight away.
const feedbackSwitch = document.getElementById("feedback-switch");
feedbackSwitch.addEventListener("change", () => setFeedbackMode(feedbackSwitch.checked));

// A link ending ?feedback=on (or off) switches feedback mode on this device.
const feedbackParam = new URLSearchParams(location.search).get("feedback");
if (feedbackParam) setFeedbackMode(feedbackParam === "on");
renderFeedbackTools();

// A note you were in the middle of when the page closed comes back to finish.
// (Once the whole page has loaded, as it needs app.js.)
addEventListener("load", () => {
  const draft = loadSaved("sc.feedbackDraft", "");
  if (draft && feedbackOn()) showBar("typing", draft);
});
