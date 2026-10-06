# ⚡ Kinetiq — Interactive Physics Simulator

Kinetiq is an interactive 2D physics simulator designed to make mechanics and physical laws easier to explore through real-time visual simulation.

The simulator combines a high-performance **C++ physics engine** with a modern **React + TypeScript** web interface. The C++ engine is compiled to **WebAssembly (WASM)** using **Emscripten**, allowing the physics simulation to run directly in the browser.

---

## 🚀 Features

Kinetiq supports:

- ⚡ Real-time 2D physics simulation
- 🌍 Gravity
- 🌀 Friction
- 💥 Collision detection and response
- 🧱 Static and dynamic bodies
- 🔵 Circle bodies
- ▭ Rectangle bodies
- 🔺 Triangle bodies
- 🚀 Projectile motion
- 🪂 Free-fall simulation
- 💨 Velocity and acceleration
- 💥 Impulse application
- ↔️ Boundary constraints
- ⏯️ Pause and resume
- ⏭️ Step-by-step simulation
- ↩️ Undo functionality
- 📊 Real-time simulation statistics
- 📈 Velocity and kinetic-energy graphs
- 🎮 Interactive body creation and manipulation
- 🧪 Guided physics experiments
- 📐 Live physics calculations and formulas

---

## 🏗️ System Architecture

Kinetiq is organized into three major layers:

```text
┌──────────────────────────────────────────────┐
│                  WEB FRONTEND                │
│                                              │
│              React + TypeScript              │
│                                              │
│   UI • Canvas • Controls • Graphs • Laws    │
└──────────────────────┬───────────────────────┘
                       │
                       │ WebAssembly API
                       ▼
┌──────────────────────────────────────────────┐
│              WEBASSEMBLY LAYER               │
│                                              │
│          Emscripten-generated WASM           │
│                                              │
│        physics_engine.wasm                   │
│        physics_engine.js                     │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│              C++ PHYSICS ENGINE              │
│                                              │
│                PhysicsEngine                 │
│                      │                       │
│                      ▼                       │
│                    World                     │
│                 /    |    \                  │
│                /     |     \                 │
│            Force  Collision  Objects         │
│                                              │
│   Vector2D • PhysicsObject • Shapes          │
│   SimulationState • Statistics               │
└──────────────────────────────────────────────┘
🧩 Technology Stack
Physics Engine
- C++
- Object-Oriented Programming
- Custom physics simulation
- Collision detection and response
- Vector mathematics
WebAssembly
- Emscripten
- WebAssembly (.wasm)
- JavaScript/WASM interface
Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- Recharts

📁 Project Structure

Kinetiq/
│
├── backend/
│   └── C++ physics engine
│
├── frontend/
│   ├── public/
│   │   ├── physics_engine.js
│   │   └── physics_engine.wasm
│   │
│   └── src/
│       ├── components/
│       ├── lib/
│       └── routes/
│
└── README.md

⚙️ How It Works
The physics simulation runs inside the C++ engine.
The browser communicates with the engine through a WebAssembly API:

User Interaction
       │
       ▼
React Interface
       │
       ▼
WebAssembly API
       │
       ▼
C++ Physics Engine
       │
       ▼
World State Update
       │
       ▼
WebAssembly
       │
       ▼
React Interface
       │
       ▼
Visualization

This architecture allows the computational physics logic to remain in C++ while the browser provides the interactive visualization layer.


🧪 Physics Experiments
Kinetiq includes interactive demonstrations covering concepts such as:
- Newton's laws of motion
- Momentum
- Kinetic energy
- Friction
- Projectile motion
- Free fall
- Collision behaviour
The experiments use the same underlying simulation engine, allowing users to observe the physics rather than only reading theoretical explanations.

.
📊 Simulation Telemetry
Kinetiq provides real-time information about the simulation, including:
- Simulation time
- Body count
- Velocity
- Acceleration
- Kinetic energy
- Forces
- Collision information
- Simulation status
Velocity and kinetic-energy history can also be visualized using interactive graphs.

.
🌐 WebAssembly Integration
The C++ physics engine is compiled using Emscripten into WebAssembly.
The browser loads:
physics_engine.js
physics_engine.wasm

The JavaScript/WASM layer exposes browser-facing operations such as:
- Creating physics bodies
- Removing bodies
- Updating position
- Updating velocity
- Applying impulses
- Configuring gravity
- Configuring friction
- Advancing the simulation
- Reading the current simulation state

🎯 Project Goal
The goal of Kinetiq is to provide an interactive environment where users can experiment with mechanics and directly observe how physical laws affect a simulated world.
Rather than presenting physics only through equations, Kinetiq connects:
Theory → Simulation → Visualization → Observation

📌 Status
Kinetiq is an actively developed interactive physics simulator.
Current development focuses on improving the simulation experience, visualizations, experiments, and intelligent assistance for understanding physics concepts.


