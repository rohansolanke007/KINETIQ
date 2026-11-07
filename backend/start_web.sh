#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

./build_web.sh

echo
 echo "Starting local web server on http://localhost:8080"
 echo "Press Ctrl+C to stop it."
cd web
python3 -m http.server 8080
