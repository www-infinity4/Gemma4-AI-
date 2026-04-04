// ── Gemma 4 AI Chatbot ──────────────────────────────────────────────
// Uses the Google Gemini API with the gemma-4-27b-it model.
// No build step required – open index.html directly in a browser.

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// System instruction: ground the assistant in legitimate science fields
const SYSTEM_INSTRUCTION = `You are Gemma 4, an expert AI assistant specialising in the following scientific and technical fields:

• Nuclear Physics & Engineering – fission, fusion, reactor design, radiation, nuclear energy
• Chemistry – organic, inorganic, physical, and electrochemistry (batteries, fuel cells, catalysis)
• Quantum Mechanics & Particle Physics – wave-particle duality, quantum field theory, the Standard Model
• Astrophysics & Cosmology – stellar evolution, black holes, the Big Bang, dark matter/energy
• Materials Science – semiconductors, nanotechnology, superconductors, advanced materials
• Electrical Engineering & Electronics – circuits, signals, power systems, photonics
• Computer Science & AI – algorithms, machine learning, software engineering
• Biology & Biochemistry – molecular biology, genetics, biochemical pathways
• Environmental & Energy Science – renewables, climate science, atmospheric physics
• Mathematics – pure and applied mathematics, statistics, information theory

Always base your answers on peer-reviewed science and established physics. Be clear, accurate, and educational. When topics are uncertain or actively researched, say so honestly.`;

// ── State ────────────────────────────────────────────────────────────
const conversationHistory = [];  // { role: "user"|"model", parts: [{text}] }[]
let isGenerating = false;

// ── DOM refs ─────────────────────────────────────────────────────────
const messagesEl    = document.getElementById("messages");
const userInputEl   = document.getElementById("userInput");
const sendBtn       = document.getElementById("sendBtn");
const apiKeyInput   = document.getElementById("apiKeyInput");
const modelSelect   = document.getElementById("modelSelect");
const modelBadge    = document.getElementById("modelBadge");
const newChatBtn    = document.getElementById("newChatBtn");
const menuBtn       = document.getElementById("menuBtn");
const sidebar       = document.querySelector(".sidebar");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");
const toggleKeyBtn  = document.getElementById("toggleKeyBtn");
const welcomeEl     = document.querySelector(".welcome");

// ── Sidebar helpers ───────────────────────────────────────────────────
function openSidebar() {
  sidebar.classList.remove("hidden");
  sidebarBackdrop.classList.add("visible");
}

function closeSidebar() {
  sidebar.classList.add("hidden");
  sidebarBackdrop.classList.remove("visible");
}

function isMobile() {
  return window.innerWidth <= 640; // matches CSS @media (max-width: 640px)
}

// ── Init: hide sidebar on mobile so the chat is visible on first load ─
if (isMobile()) closeSidebar();

// ── Sidebar toggle ───────────────────────────────────────────────────
menuBtn.addEventListener("click", () => {
  if (sidebar.classList.contains("hidden")) {
    openSidebar();
  } else {
    closeSidebar();
  }
});

sidebarBackdrop.addEventListener("click", closeSidebar);

// ── API key show/hide ────────────────────────────────────────────────
toggleKeyBtn.addEventListener("click", () => {
  const isPassword = apiKeyInput.type === "password";
  apiKeyInput.type = isPassword ? "text" : "password";
  toggleKeyBtn.setAttribute("title", isPassword ? "Hide key" : "Show key");
});

// ── Model badge update ───────────────────────────────────────────────
modelSelect.addEventListener("change", () => {
  modelBadge.textContent = modelSelect.value;
});

// ── Auto-resize textarea ─────────────────────────────────────────────
userInputEl.addEventListener("input", () => {
  userInputEl.style.height = "auto";
  userInputEl.style.height = Math.min(userInputEl.scrollHeight, 180) + "px";
  sendBtn.disabled = userInputEl.value.trim() === "" || isGenerating;
});

// ── API key: press Enter to move focus to message input ──────────────
apiKeyInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    if (isMobile()) closeSidebar();
    userInputEl.focus();
  }
});

// ── Send on Enter (Shift+Enter = newline) ────────────────────────────
userInputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!sendBtn.disabled) sendMessage();
  }
});

sendBtn.addEventListener("click", sendMessage);

// ── Suggestion chips ─────────────────────────────────────────────────
document.querySelectorAll(".suggestion-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    if (isMobile()) closeSidebar();
    userInputEl.value = chip.dataset.text;
    userInputEl.dispatchEvent(new Event("input"));
    sendMessage();
  });
});

// ── New chat ──────────────────────────────────────────────────────────
newChatBtn.addEventListener("click", () => {
  conversationHistory.length = 0;
  messagesEl.innerHTML = "";
  if (welcomeEl) messagesEl.appendChild(welcomeEl);
  userInputEl.value = "";
  userInputEl.style.height = "auto";
  sendBtn.disabled = true;
});

// ── Core: send message ────────────────────────────────────────────────
async function sendMessage() {
  const text = userInputEl.value.trim();
  if (!text || isGenerating) return;

  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    showError("Please enter your Google AI Studio API key in the sidebar.");
    return;
  }

  // Hide welcome screen on first message
  if (welcomeEl && welcomeEl.parentNode) welcomeEl.remove();

  // Append user message
  appendMessage("user", text);
  conversationHistory.push({ role: "user", parts: [{ text }] });

  userInputEl.value = "";
  userInputEl.style.height = "auto";
  sendBtn.disabled = true;
  isGenerating = true;

  // Show typing indicator
  const typingEl = appendTyping();

  try {
    const responseText = await callGemmaAPI(apiKey, modelSelect.value);
    typingEl.remove();
    appendMessage("model", responseText);
    conversationHistory.push({ role: "model", parts: [{ text: responseText }] });
  } catch (err) {
    typingEl.remove();
    showError(formatAPIError(err));
  } finally {
    isGenerating = false;
    sendBtn.disabled = userInputEl.value.trim() === "";
    scrollToBottom();
  }
}

// ── Gemini API call ───────────────────────────────────────────────────
async function callGemmaAPI(apiKey, model) {
  const url = `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: conversationHistory,
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 8192,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const msg = errData?.error?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];

  if (!candidate) throw new Error("No response from the API. The model may have blocked this request.");

  const finishReason = candidate.finishReason;
  if (finishReason === "SAFETY") throw new Error("Response blocked by safety filters.");
  if (finishReason === "RECITATION") throw new Error("Response blocked due to recitation policy.");

  return candidate.content?.parts?.map((p) => p.text).join("") || "(empty response)";
}

// ── Render helpers ────────────────────────────────────────────────────
function appendMessage(role, text) {
  const row = document.createElement("div");
  row.className = `message ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";

  if (role === "model") {
    avatar.innerHTML = `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="20" fill="url(#ag)"/>
      <path d="M12 20c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="20" cy="20" r="3" fill="#fff"/>
      <defs><linearGradient id="ag" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop stop-color="#4285F4"/><stop offset="1" stop-color="#34A853"/>
      </linearGradient></defs></svg>`;
  } else {
    avatar.textContent = "You";
  }

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = renderMarkdown(text);

  row.appendChild(avatar);
  row.appendChild(bubble);
  messagesEl.appendChild(row);
  scrollToBottom();
  return row;
}

function appendTyping() {
  const row = document.createElement("div");
  row.className = "message model";
  row.innerHTML = `
    <div class="avatar">
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="url(#tg)"/>
        <path d="M12 20c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="20" cy="20" r="3" fill="#fff"/>
        <defs><linearGradient id="tg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stop-color="#4285F4"/><stop offset="1" stop-color="#34A853"/>
        </linearGradient></defs>
      </svg>
    </div>
    <div class="bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
  messagesEl.appendChild(row);
  scrollToBottom();
  return row;
}

function showError(msg) {
  const el = document.createElement("div");
  el.className = "error-msg";
  el.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    <span>${escapeHtml(msg)}</span>`;
  messagesEl.appendChild(el);
  scrollToBottom();
}

function formatAPIError(err) {
  const msg = err?.message || String(err);
  if (msg.includes("API_KEY_INVALID") || msg.includes("API key")) return "Invalid API key. Get one at aistudio.google.com/apikey";
  if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) return "API quota exceeded. Try again later or check your Google AI Studio limits.";
  if (msg.includes("MODEL_NOT_FOUND") || msg.includes("not found")) return `Model "${modelSelect.value}" not found. It may not yet be available on your API key. Try a different model.`;
  return msg;
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ── Lightweight Markdown renderer ─────────────────────────────────────
function renderMarkdown(text) {
  // Escape HTML first, then selectively un-escape for markdown
  let out = text;

  // Code blocks (``` ... ```)
  out = out.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="lang-${escapeHtml(lang)}">${escapeHtml(code.trim())}</code></pre>`;
  });

  // Inline code
  out = out.replace(/`([^`\n]+)`/g, (_, c) => `<code>${escapeHtml(c)}</code>`);

  // Headings
  out = out.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  out = out.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  out = out.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold & italic
  out = out.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Blockquote
  out = out.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");
  out = out.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");

  // Unordered lists
  out = out.replace(/(^[*\-] .+(\n[*\-] .+)*)/gm, (block) => {
    const items = block.split("\n").map((l) => `<li>${l.replace(/^[*\-] /, "")}</li>`).join("");
    return `<ul>${items}</ul>`;
  });

  // Ordered lists
  out = out.replace(/(^\d+\. .+(\n\d+\. .+)*)/gm, (block) => {
    const items = block.split("\n").map((l) => `<li>${l.replace(/^\d+\. /, "")}</li>`).join("");
    return `<ol>${items}</ol>`;
  });

  // Paragraphs (double newline)
  out = out.replace(/\n{2,}/g, "</p><p>");
  out = "<p>" + out + "</p>";

  // Single newlines inside paragraphs → <br>
  out = out.replace(/(?<!<\/?(p|ul|ol|li|h[1-3]|pre|blockquote)>)\n(?!<(p|ul|ol|li|h[1-3]|pre|blockquote)>)/g, "<br>");

  // Clean up empty paragraphs
  out = out.replace(/<p>\s*<\/p>/g, "");

  return out;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
