#!/usr/bin/env sh
set -eu

PORT="${GEMMA_PORT:-8080}"
CONTEXT="${GEMMA_CONTEXT:-8192}"
MODEL_SOURCE="${GEMMA_MODEL:-ggml-org/gemma-4-E2B-it-GGUF}"

if command -v llama-server >/dev/null 2>&1; then
  SERVER="llama-server"
elif [ -x "./bin/llama-server" ]; then
  SERVER="./bin/llama-server"
else
  echo "llama-server was not found. Put the prebuilt binary at ./bin/llama-server."
  exit 1
fi

case "$MODEL_SOURCE" in
  *.gguf) exec "$SERVER" -m "$MODEL_SOURCE" --host 127.0.0.1 --port "$PORT" -c "$CONTEXT" ;;
  *) exec "$SERVER" -hf "$MODEL_SOURCE" --host 127.0.0.1 --port "$PORT" -c "$CONTEXT" ;;
esac
