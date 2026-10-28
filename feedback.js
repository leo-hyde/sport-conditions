// Feedback mode: speak (or type) a note about the app while you use it, and
// Send it to GitHub as an Issue for Claude to work through.
// Turned on in Settings → Feedback, or by opening the page with ?feedback=on.
//
// With a send code (Settings → Feedback), notes go straight to GitHub through
// the Worker. Without one, Send opens GitHub's "new issue" page, filled in.

const FEEDBACK_REPO = "leo-hyde/sport-conditions";
const APP_STAGE = "Beta";  // no version numbers yet: see CHANGELOG.md
const FEEDBACK_URL = "https://sport-conditions-weather.leo-h-hyde.workers.dev/feedback";
const MAX_URL_LENGTH = 7000;  // longer GitHub links can fail, so big batches are split
const KEEP_SENT = 30;  // how many sent notes "Your requests" remembers

const feedbackTools = document.getElementById("feedback-tools");
const feedbackBar = document.getElementById("feedback-bar");
const feedbackText = document.getElementById("feedback-text");
const feedbackInput = document.getElementById("feedback-input");
const feedbackDialog = document.getElementById("feedback-dialog");

// The browser's speech-to-text ("speech recognition"). Chrome and Safari have
// it; some browsers don't, and then the ✎ button lets you type instead.
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// [{ text, context, sent, issue }]; issue is { number, url } once GitHub has it.
let notes = loadSaved("sc.feedbackNotes", []);
let listening = false;  // true from 🎙 until Done or ✕
let listener = null;  // the speech recognition currently running
let heard = "";  // words finished so far in this note

function feedbackOn() {
  return loadSaved("sc.feedback", false);
}

function setFeedbackMode(on) {
  save("sc.feedback", on);
  renderFeedbackTools();
}

function saveNotes() {
  // Forget the oldest sent notes once there are lots.
  const sent = notes.filter(note => note.sent);
  if (sent.length > KEEP_SENT) notes = notes.filter(note => !sent.slice(0, sent.length - KEEP_SENT).includes(note));
  save("sc.feedbackNotes", notes);
  renderFeedbackTools();
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
  setPaused(false);
  keepScreenOn(true);
  listenOnce();
}

// ⏸ stops listening but keeps the note open, with every word so far;
// ▶ carries on adding to the same note.
function togglePause() {
  if (listening) {
    heard = feedbackText.textContent;  // keep any half-finished phrase
    stopListening();
    setPaused(true);
  } else {
    listening = true;
    setPaused(false);
    keepScreenOn(true);
    listenOnce();
  }
}

function setPaused(paused) {
  feedbackBar.dataset.paused = paused;
  const button = document.getElementById("feedback-pause");
  button.textContent = paused ? "▶" : "⏸";
  button.setAttribute("aria-label", paused ? "Carry on listening" : "Pause");
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
    if (listener !== recognition) return;  // paused or stopped: ignore late words
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
  feedbackText.scrollTop = feedbackText.scrollHeight;  // keep the newest words in view
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

// Send: save the note, then send it on its way.
function sendNote() {
  // Everything on screen, including a phrase the phone hasn't finished with.
  const text = (feedbackBar.dataset.mode === "typing" ? feedbackInput.value : feedbackText.textContent).trim();
  notePlace();
  hideBar();
  if (!text) return;
  const note = { text, context: feedbackContext(), sent: false, issue: null };
  notes.push(note);
  saveNotes();
  if (sendCode()) {
    sendThroughWorker(note);
  } else {
    openOnGitHub([note]);
    showToast("Opened GitHub: tap Create there", "Your requests", openFeedbackDialog);
  }
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

// ---------- Sending ----------

function sendCode() {
  return loadSaved("sc.feedbackCode", "");
}

// The text GitHub gets for some notes.
function issueText(batch) {
  const first = batch[0];
  const title = batch.length === 1
    ? `Feedback: ${first.text.length > 60 ? first.text.slice(0, 57) + "…" : first.text}`
    : `Feedback: ${batch.length} notes (${first.context.time.slice(0, 10)})`;
  const body = batch.map((note, i) => `### ${batch.length > 1 ? `${i + 1}. ` : ""}${note.text}\n<sub>${contextLine(note.context)}</sub>`).join("\n\n")
    + `\n\n---\n${APP_STAGE} · ${first.context.forecast} forecast · ${first.context.browser}`;
  return { title, body };
}

// Straight to GitHub through the Worker (which holds the secret GitHub key).
async function sendThroughWorker(note) {
  try {
    const response = await fetch(FEEDBACK_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },  // avoids an extra permission check
      body: JSON.stringify({ code: sendCode(), ...issueText([note]) }),
    });
    if (!response.ok) throw new Error(await response.text());
    note.issue = await response.json();
    note.sent = true;
    saveNotes();
    showToast(`Sent ✓ #${note.issue.number}`, "Your requests", openFeedbackDialog);
  } catch (error) {
    console.warn("Feedback not sent:", error.message);
    showToast("Couldn't send: it's kept in Your requests", "Open", openFeedbackDialog);
  }
}

// GitHub's "new issue" page, filled in; you tap Create. Marked as sent, as we
// can't tell whether you did ("Send again" is there if not).
function openOnGitHub(batch) {
  const { title, body } = issueText(batch);
  const params = new URLSearchParams({ title, body, labels: "feedback" });
  window.open(`https://github.com/${FEEDBACK_REPO}/issues/new?${params}`, "_blank");
  batch.forEach(note => { note.sent = true; });
  saveNotes();
}

// Unsent notes (e.g. no internet at the time): as many as fit in one link.
function sendWaiting() {
  const waiting = notes.filter(note => !note.sent);
  let batch = [];
  for (const note of waiting) {
    const { title, body } = issueText([...batch, note]);
    if (batch.length > 0 && (title + body).length * 1.5 > MAX_URL_LENGTH) break;  // links grow when encoded
    batch.push(note);
  }
  openOnGitHub(batch);
  renderRequests();
}

// ---------- Your requests ----------

function openFeedbackDialog() {
  renderRequests();
  if (!feedbackDialog.open) feedbackDialog.showModal();
}

// Waiting notes first (editable), then sent ones, newest first.
function renderRequests() {
  const waiting = notes.filter(note => !note.sent);
  const sent = notes.filter(note => note.sent).reverse();
  const item = (note, body) => `<div class="feedback-note">${body}
      <div class="feedback-note-foot">
        <small class="muted">${esc(contextLine(note.context))}</small>
        <button type="button" class="btn small ghost danger" data-delete-note="${notes.indexOf(note)}">Delete</button>
      </div>
    </div>`;

  document.getElementById("feedback-waiting").innerHTML = waiting.length === 0 ? "" :
    `<h3>Not sent yet</h3>` + waiting.map(note => item(note,
      `<textarea data-note="${notes.indexOf(note)}" rows="2" aria-label="Note">${esc(note.text)}</textarea>`)).join("") +
    `<button type="button" id="feedback-send" class="btn primary small">Send ${waiting.length === 1 ? "it" : "them"} via GitHub</button>`;

  document.getElementById("feedback-list").innerHTML = sent.length === 0
    ? (waiting.length === 0 ? '<p class="muted">Nothing yet. Tap 🎙 and say what you\'d change, wherever you are in the app.</p>' : "")
    : `<h3>Sent</h3>` + sent.map(note => item(note,
      `<p class="feedback-sent-text">${esc(note.text)}</p>
       <p class="feedback-status">${note.issue
          ? `✓ Saved on GitHub as <a href="${note.issue.url}" target="_blank" rel="noopener">#${note.issue.number}</a>`
          : `Opened on GitHub · <button type="button" class="link-btn" data-resend="${notes.indexOf(note)}">Didn't create it? Send again</button>`}</p>`)).join("");
}

// ---------- Buttons ----------

// › folds the three buttons away, leaving one small tab; remembered between visits.
const feedbackFabs = document.getElementById("feedback-fabs");
const feedbackFold = document.getElementById("feedback-fold");
function setFolded(folded) {
  feedbackFabs.classList.toggle("folded", folded);
  feedbackFold.textContent = folded ? "‹" : "›";
  feedbackFold.setAttribute("aria-expanded", String(!folded));
  feedbackFold.setAttribute("aria-label", folded ? "Show the feedback buttons" : "Hide the feedback buttons");
  save("sc.feedbackFolded", folded);
}
feedbackFold.addEventListener("click", () => setFolded(!feedbackFabs.classList.contains("folded")));
setFolded(loadSaved("sc.feedbackFolded", false) === true);

document.getElementById("feedback-mic").addEventListener("click", startListening);
document.getElementById("feedback-type").addEventListener("click", () => showBar("typing"));
document.getElementById("feedback-open").addEventListener("click", openFeedbackDialog);
document.getElementById("feedback-done").addEventListener("click", sendNote);
document.getElementById("feedback-cancel").addEventListener("click", hideBar);
document.getElementById("feedback-pause").addEventListener("click", togglePause);
feedbackInput.addEventListener("keydown", event => {
  if (event.key === "Enter") sendNote();
});

feedbackDialog.addEventListener("input", event => {
  const box = event.target.closest("[data-note]");
  if (!box) return;
  notes[box.dataset.note].text = box.value;
  save("sc.feedbackNotes", notes);
});
feedbackDialog.addEventListener("click", event => {
  const remove = event.target.closest("[data-delete-note]");
  if (remove) {
    notes.splice(Number(remove.dataset.deleteNote), 1);
    saveNotes();
    renderRequests();
  }
  const resend = event.target.closest("[data-resend]");
  if (resend) openOnGitHub([notes[resend.dataset.resend]]);
  if (event.target.closest("#feedback-send")) sendWaiting();
});

// The send code (Settings → Feedback) is saved as you type it.
const feedbackCodeBox = document.getElementById("feedback-code");
feedbackCodeBox.addEventListener("input", () => save("sc.feedbackCode", feedbackCodeBox.value.trim()));

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
