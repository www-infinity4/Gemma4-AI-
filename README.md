# Gemma 4 AI Chatbot

A fully front-end chatbot powered by **Gemma 4** — Google's latest open AI model (released March 31, 2026) — accessed via the Google Gemini API.

No build step, no server, no dependencies. Just open `index.html` in your browser.

---

## Features

- 🤖 **Gemma 4 models** — choose between 27B, 31B, E4B, and E2B variants
- 🔬 **Science-focused system prompt** — grounded in nuclear physics, chemistry, quantum mechanics, materials science, astrophysics, engineering, and more
- 💬 **Full conversation history** — multi-turn chat with context
- 📝 **Markdown rendering** — code blocks, headers, bold/italic, lists, blockquotes
- 📱 **Responsive design** — works on desktop and mobile
- 🔑 **Client-side only** — your API key is never stored or sent anywhere except directly to the Google AI API

---

## Quick Start

1. **Get a free API key** at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. **Open `index.html`** in any modern browser (Chrome, Firefox, Safari, Edge)
3. **Paste your API key** into the sidebar field
4. **Start chatting!**

---

## Model Options

| Model | Description |
|---|---|
| `gemma-4-27b-it` | Recommended — balanced capability and speed |
| `gemma-4-31b-it` | Most capable (dense 31B model) |
| `gemma-4-e4b-it` | Efficient 4B — fast responses |
| `gemma-4-e2b-it` | Efficient 2B — fastest, lightest |

---

## Scientific Fields Covered

The assistant is grounded in the following domains:

- Nuclear Physics & Engineering (fission, fusion, reactor design, radiation)
- Chemistry (organic, inorganic, physical, electrochemistry, catalysis)
- Quantum Mechanics & Particle Physics
- Astrophysics & Cosmology
- Materials Science & Nanotechnology
- Electrical Engineering & Electronics
- Computer Science & AI
- Biology & Biochemistry
- Environmental & Energy Science
- Mathematics & Statistics

---

## Project Structure

```
index.html   — Chat UI (message thread, input bar, model selector)
style.css    — Dark-mode responsive styles
app.js       — API integration, Markdown rendering, conversation state
```

---

## Notes

- API keys are kept in the browser session only and are never persisted to disk or sent to any third party.
- Requires an internet connection to reach the Google Gemini API.
- Usage is subject to [Google AI Studio terms](https://ai.google.dev/gemma/terms) and your API quota.