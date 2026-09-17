# ⚛️ Mini Physics Engine

A 2D physics simulation engine developed in **C++ using Object-Oriented Programming principles**, with an interactive web-based interface built using **React and TypeScript**.

The C++ physics engine is compiled to **WebAssembly (WASM)** using **Emscripten**, allowing the physics simulation to run directly inside a modern web browser.

---

## 🎯 Project Overview

The **Mini Physics Engine** is an educational 2D physics simulation project designed to demonstrate the practical application of **Object-Oriented Programming in C++**.

The project combines a modular C++ physics engine with a modern web interface, allowing users to interact with and visualize the simulation in real time.

The engine supports:

- ⚡ Real-time physics simulation
- 🌍 Gravity
- 🌀 Friction
- 💥 Collision detection and response
- 🧱 Static and dynamic objects
- 🔵 Circle objects
- ▭ Rectangle objects
- 🔺 Triangle objects
- 🚀 Projectile motion
- 🪂 Free-fall simulation
- 💨 Velocity and acceleration
- 💥 Impulse application
- ↔️ Boundary constraints
- ⏯️ Pause and resume
- ⏭️ Step-by-step simulation
- ↩️ Undo functionality
- 📊 Real-time simulation statistics
- 🎮 Interactive object creation and manipulation

---

# 🏗️ System Architecture

The project consists of three major layers:

```text
┌──────────────────────────────────────────────┐
│              WEB FRONTEND                    │
│          React + TypeScript                  │
│                                              │
│  UI • Canvas • Controls • Experiments       │
└──────────────────────┬───────────────────────┘
                       │
                       │ WebAssembly API
                       ▼
┌──────────────────────────────────────────────┐
│             WEBASSEMBLY LAYER                │
│                                              │
│       Emscripten-generated WASM              │
│       physics_engine.wasm                    │
│       physics_engine.js                      │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│              C++ PHYSICS ENGINE              │
│                                              │
│  PhysicsEngine                               │
│       │                                      │
│       ▼                                      │
│     World                                    │
│    /  |  \                                   │
│   /   |   \                                  │
│Force Collision ObjectManager                 │
│                                              │
│ Vector2D • PhysicsObject • Shapes            │
│ SimulationState • Statistics                 │
└──────────────────────────────────────────────┘
│ SimulationState • Statistics                 │
└──────────────────────────────────────────────┘
