#!/usr/bin/env bash
# Poll an HTTP endpoint until it returns 200, or time out.
#
# Usage: wait-health.sh <url> <response-file> [timeout-seconds] [sleep-seconds]
# Exits 0 on the first HTTP 200; exits 1 on timeout (dumping the last response body).
#
# Shared by the cnpmcore and cnpmcore-snapshot e2e jobs in
# .github/workflows/e2e-test.yml. Deliberately does not `set -e` so the
# curl-poll loop controls flow; callers wrap it in `if wait-health.sh ...; then`.
set -uo pipefail

URL="$1"
RESPONSE_FILE="$2"
TIMEOUT="${3:-120}"
SLEEP="${4:-5}"

START_TIME=$(date +%s)
echo "Waiting for ${URL} to return HTTP 200 (timeout: ${TIMEOUT}s)..."
while true; do
  STATUS=$(curl -s -o "${RESPONSE_FILE}" -w "%{http_code}" "${URL}" || echo "000")
  echo "Health check at $(date): status=${STATUS}"

  if [ "${STATUS}" = "200" ]; then
    echo "Health check succeeded with status 200"
    exit 0
  fi

  NOW=$(date +%s)
  ELAPSED=$((NOW - START_TIME))
  if [ "${ELAPSED}" -ge "${TIMEOUT}" ]; then
    echo "Health check timed out after ${ELAPSED}s with last status ${STATUS}"
    echo "Last response body (if any):"
    cat "${RESPONSE_FILE}" 2>/dev/null || echo "<no response body captured>"
    exit 1
  fi

  sleep "${SLEEP}"
done
