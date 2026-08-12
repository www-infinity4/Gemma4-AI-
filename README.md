# Gemma 4 Local AI

This branch replaces the key-gated Gemini API wiring with a real local Gemma 4 connection. The browser interface sends chat requests to the OpenAI-compatible endpoint exposed by `llama-server`. No Google API key is requested, saved, or transmitted.

## What works

- Local Gemma 4 chat through `http://127.0.0.1:8080/v1`
- Multi-turn history saved on the device
- Connection check with a clear online/offline state
- Mobile hamburger/settings panel
- E2B, E4B, 12B, 26B A4B, and 31B profiles
- A start script supporting either an existing GGUF file or a Hugging Face model ID
- Optional retrieval grounding from Wikipedia, Wikidata, and DuckDuckGo Instant Answers
- A persistent local knowledge graph with evidence state and source URLs

## Start it

1. Put a current prebuilt `llama-server` binary at `bin/llama-server`, or make it available on your PATH.
2. Run:

   ```sh
   chmod +x start-gemma.sh
   ./start-gemma.sh
   ```

3. Open `index.html` and press **Check local engine**.

The default model is `ggml-org/gemma-4-E2B-it-GGUF`, the smallest Gemma 4 profile and the practical starting point for a phone or low-memory machine. To use a downloaded model without another network download:

```sh
GEMMA_MODEL=/full/path/to/model.gguf ./start-gemma.sh
```

Optional controls:

```sh
GEMMA_PORT=8080 GEMMA_CONTEXT=8192 ./start-gemma.sh
```

## Important boundary

GitHub Pages can host the interface, but it cannot run the model weights. The local `llama-server` process is the reasoning engine. This is still key-free and local: it does not depend on the Gemini API.

## Research and reasoning path

When research grounding is enabled, `research.js` queries the three free sources in parallel, places returned excerpts in a separate system context, and stores a compact entry in the local knowledge graph. Source chips are displayed under the response. When no source responds, the model is explicitly told not to invent citations.

This preserves the Octave/Infinity terminal boundary: external excerpts are tagged `EXTERNALLY_VERIFIED` as retrieved source material, knowledge-graph summaries remain prior-session context, and Gemma's synthesis remains model inference.
