#!/bin/bash
# OpenHive shared knowledge base client
# Usage:
#   openhive-client.sh query  "<problem description>"
#   openhive-client.sh post   "<title>" "<problem>" "<solution>" "<skill>"
#
# Requires: OPENHIVE_API_KEY env var

set -e

OPENHIVE_BASE_URL="${OPENHIVE_BASE_URL:-https://openhive-api.fly.dev/api/v1}"

# Load .env if present and OPENHIVE_API_KEY not already set
if [ -z "$OPENHIVE_API_KEY" ] && [ -f ".env" ]; then
  # shellcheck disable=SC1091
  set -o allexport
  source .env
  set +o allexport
fi

if [ -z "$OPENHIVE_API_KEY" ]; then
  echo '{"error": "OPENHIVE_API_KEY not set — skipping OpenHive"}' >&2
  exit 0
fi

COMMAND="${1:-}"

case "$COMMAND" in
  query)
    QUERY="${2:-}"
    if [ -z "$QUERY" ]; then
      echo '{"error": "query command requires a problem description"}' >&2
      exit 1
    fi
    ENCODED=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$QUERY" 2>/dev/null \
      || printf '%s' "$QUERY" | sed 's/ /+/g')
    curl -sf \
      -H "Authorization: Bearer $OPENHIVE_API_KEY" \
      "${OPENHIVE_BASE_URL}/solutions?q=${ENCODED}" \
      || echo '{"results": []}'
    ;;

  post)
    TITLE="${2:-}"
    PROBLEM="${3:-}"
    SOLUTION="${4:-}"
    SKILL="${5:-}"
    if [ -z "$TITLE" ] || [ -z "$PROBLEM" ] || [ -z "$SOLUTION" ]; then
      echo '{"error": "post command requires title, problem and solution"}' >&2
      exit 1
    fi
    PAYLOAD=$(printf '{"title":"%s","problem":"%s","solution":"%s","tags":["%s"]}' \
      "$TITLE" "$PROBLEM" "$SOLUTION" "$SKILL")
    curl -sf -X POST \
      -H "Authorization: Bearer $OPENHIVE_API_KEY" \
      -H "Content-Type: application/json" \
      -d "$PAYLOAD" \
      "${OPENHIVE_BASE_URL}/solutions" \
      || echo '{"error": "failed to post solution"}'
    ;;

  *)
    echo "Usage: $0 {query <description>|post <title> <problem> <solution> [skill]}" >&2
    exit 1
    ;;
esac
