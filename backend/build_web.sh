#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if ! command -v emcc >/dev/null 2>&1; then
  echo "Emscripten (emcc) is not installed or not on PATH."
  echo "Install it first: https://emscripten.org/docs/getting_started/downloads.html"
  exit 1
fi

mkdir -p web

em++ \
  -std=c++17 \
  -O2 \
  -Wall -Wextra \
  -Iinclude \
  src/Collision.cpp \
  src/CollisionSimulation.cpp \
  src/Force.cpp \
  src/FreeBodyDiagram.cpp \
  src/InclinedPlaneSimulation.cpp \
  src/PendulumSimulation.cpp \
  src/PhysicsEngine.cpp \
  src/PhysicsObject.cpp \
  src/ProjectileSimulation.cpp \
  src/SeriesRecorder.cpp \
  src/SHMSimulation.cpp \
  src/Shape.cpp \
  src/Simulation.cpp \
  src/SimulationManager.cpp \
  src/SimulationState.cpp \
  src/Vector2D.cpp \
  src/World.cpp \
  src/WebAPI.cpp \
  --bind \
  -fexceptions \
  -sALLOW_MEMORY_GROWTH=1 \
  -sENVIRONMENT=web \
  -sASSERTIONS=1 \
  -o web/physics_engine.js

echo
# Keep the React app's copy of the engine in sync with the fresh build.
if [ -d "../frontend/public" ]; then
  cp web/physics_engine.js web/physics_engine.wasm ../frontend/public/
  echo "Copied physics_engine.js/.wasm to frontend/public/"
fi

echo "WebAssembly build complete."
echo "Serve the web directory with:"
echo "  cd web && python3 -m http.server 8080"
echo "Then open: http://localhost:8080"
