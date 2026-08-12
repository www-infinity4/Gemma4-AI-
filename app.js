const DEFAULT_ENDPOINT = "http://127.0.0.1:8080/v1";
const SETTINGS_KEY = "infinity_gemma_local_settings_v1";
const HISTORY_KEY = "infinity_gemma_local_history_v1";
const SYSTEM_PROMPT = `You are the local Gemma 4 reasoning engine inside Infinity AI. Help with research, writing, coding, engineering, and project planning. Preserve the user's intended design and terminology. Clearly separate established evidence, reasonable inference, and untested theory. Never pretend that a file, website, test, or external system was inspected when it was not.`;

const state = { generating: false, serverModel: null, messages: loadJson(HISTORY_KEY, []) };
const el = {
  messages: document.getElementById("messages"), userInput: document.getElementById("userInput"),
  send: document.getElementById("sendBtn"), endpoint: document.getElementById("endpointInput"),
  profile: document.getElementById("modelSelect"), badge: document.getElementById("modelBadge"),
  status: document.getElementById("connectionStatus"), connect: document.getElementById("connectBtn"),
  sidebar: document.querySelector(".sidebar"), backdrop: document.getElementById("sidebarBackdrop"),
  menu: document.getElementById("menuBtn"), newChat: document.getElementById("newChatBtn"),
  welcome: document.getElementById("welcome")
};

const saved = loadJson(SETTINGS_KEY, {});
el.endpoint.value = saved.endpoint || DEFAULT_ENDPOINT;
el.profile.value = saved.profile || "gemma-4-E2B-it";
if (window.innerWidth > 640) el.sidebar.classList.remove("hidden");
renderHistory();

el.menu.addEventListener("click", () => toggleSidebar());
el.backdrop.addEventListener("click", () => toggleSidebar(false));
el.connect.addEventListener("click", checkConnection);
el.newChat.addEventListener("click", clearConversation);
el.endpoint.addEventListener("change", saveSettings);
el.profile.addEventListener("change", () => { saveSettings(); updateBadge(); });
el.userInput.addEventListener("input", resizeInput);
el.userInput.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (!el.send.disabled) sendMessage(); }
});
el.send.addEventListener("click", sendMessage);
document.querySelectorAll(".suggestion-chip").forEach(button => button.addEventListener("click", () => {
  el.userInput.value = button.dataset.text; resizeInput(); sendMessage();
}));

function apiBase() { return el.endpoint.value.trim().replace(/\/+$/, ""); }
function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ endpoint: apiBase() || DEFAULT_ENDPOINT, profile: el.profile.value }));
  state.serverModel = null;
}
function loadJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function toggleSidebar(force) {
  const open = force ?? el.sidebar.classList.contains("hidden");
  el.sidebar.classList.toggle("hidden", !open); el.backdrop.classList.toggle("visible", open && window.innerWidth <= 640);
}
function resizeInput() {
  el.userInput.style.height = "auto"; el.userInput.style.height = `${Math.min(el.userInput.scrollHeight, 180)}px`;
  el.send.disabled = !el.userInput.value.trim() || state.generating;
}
function setStatus(kind, text) {
  el.status.className = `status ${kind}`; el.status.innerHTML = `<span></span>${escapeHtml(text)}`;
}
function updateBadge() { el.badge.textContent = state.serverModel || `${el.profile.value} · local`; }

async function checkConnection() {
  saveSettings(); setStatus("checking", "Checking…"); el.connect.disabled = true;
  try {
    const response = await fetch(`${apiBase()}/models`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Local engine returned HTTP ${response.status}`);
    const body = await response.json();
    state.serverModel = body?.data?.[0]?.id || el.profile.value;
    setStatus("online", "Local engine online"); updateBadge();
    return true;
  } catch (error) {
    state.serverModel = null; setStatus("offline", friendlyConnectionError(error)); updateBadge();
    return false;
  } finally { el.connect.disabled = false; }
}

async function sendMessage() {
  const text = el.userInput.value.trim();
  if (!text || state.generating) return;
  if (el.welcome?.isConnected) el.welcome.remove();
  appendMessage("user", text); state.messages.push({ role: "user", content: text }); persistHistory();
  el.userInput.value = ""; resizeInput(); state.generating = true; el.send.disabled = true;
  const typing = appendTyping();
  try {
    if (!state.serverModel && !(await checkConnection())) throw new Error("LOCAL_ENGINE_OFFLINE");
    const response = await fetch(`${apiBase()}/chat/completions`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: state.serverModel || el.profile.value,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...state.messages.slice(-24)],
        temperature: 0.7, top_p: 0.95, max_tokens: 4096, stream: false
      })
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body?.error?.message || `Local engine returned HTTP ${response.status}`);
    }
    const body = await response.json();
    const answer = body?.choices?.[0]?.message?.content?.trim();
    if (!answer) throw new Error("The local engine returned an empty response.");
    typing.remove(); appendMessage("assistant", answer); state.messages.push({ role: "assistant", content: answer }); persistHistory();
  } catch (error) {
    typing.remove(); showError(error.message === "LOCAL_ENGINE_OFFLINE" ? "Start llama-server with ./start-gemma.sh, then press Check local engine." : error.message);
  } finally { state.generating = false; resizeInput(); }
}

function persistHistory() { localStorage.setItem(HISTORY_KEY, JSON.stringify(state.messages.slice(-50))); }
function clearConversation() {
  state.messages = []; localStorage.removeItem(HISTORY_KEY); el.messages.innerHTML = "";
  if (el.welcome) el.messages.appendChild(el.welcome); el.userInput.value = ""; resizeInput();
}
function renderHistory() {
  if (!Array.isArray(state.messages) || !state.messages.length) return;
  if (el.welcome?.isConnected) el.welcome.remove();
  state.messages.forEach(message => appendMessage(message.role, message.content));
}
function appendMessage(role, text) {
  const row = document.createElement("div"); row.className = `message ${role === "user" ? "user" : "model"}`;
  const avatar = document.createElement("div"); avatar.className = "avatar"; avatar.textContent = role === "user" ? "You" : "G4";
  const bubble = document.createElement("div"); bubble.className = "bubble"; bubble.textContent = text;
  row.append(avatar, bubble); el.messages.appendChild(row); scrollBottom(); return row;
}
function appendTyping() {
  const row = document.createElement("div"); row.className = "message model";
  row.innerHTML = '<div class="avatar">G4</div><div class="bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>';
  el.messages.appendChild(row); scrollBottom(); return row;
}
function showError(text) {
  const row = document.createElement("div"); row.className = "error-msg"; row.textContent = text; el.messages.appendChild(row); scrollBottom();
}
function friendlyConnectionError(error) {
  if (error instanceof TypeError) return "Offline — start llama-server";
  return `Offline — ${error.message}`;
}
function scrollBottom() { el.messages.scrollTop = el.messages.scrollHeight; }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }
