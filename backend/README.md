> **Note:** this is the original engine README. For the full platform (dedicated simulations, free-body
> diagrams, energy and momentum, tests and the web app), see the [root README](../README.md) and
> [docs/WASM_API.md](../docs/WASM_API.md). Run `make test` here for the unit tests.

# ⚙️ Mini Physics Engine

### Interactive 2D Physics Simulation Engine built in C++ and WebAssembly

A lightweight 2D physics simulation engine developed in **C++** as an Object-Oriented Programming project.

The project demonstrates core **OOP, STL, physics simulation, collision detection, exception handling, file handling, and WebAssembly** concepts through an interactive browser-based interface.

---

## 🚀 Live Interactive Interface

The project includes a browser-based interface that allows users to create and interact with objects in the physics simulation.

### What you can do

- Add dynamic physics objects
- Add static objects
- Create circles, rectangles and triangles
- Modify position and velocity
- Configure gravity
- Configure friction
- Change simulation time step
- Apply forces / impulses
- Run, pause and step through the simulation
- Detect and visualize collisions
- View real-time physics statistics
- Inspect individual objects
- Load demonstration scenes
- Reset the simulation

---

## 🖥️ Interface Preview

The web interface provides a real-time visualization of the physics engine.

![Physics Engine Interface](web/screenshot.png)

> Add your project screenshot as `web/screenshot.png`.

---

## 🧠 Physics Concepts

The engine implements fundamental concepts used in 2D physics simulation.

### Gravity

Objects experience gravitational acceleration:

```text
F = m × g
```

where:

- `m` = mass
- `g` = gravitational acceleration

### Velocity and Position

Object positions are updated using their velocity and simulation time step.

```text
position = position + velocity × Δt
```

### Forces

Forces modify the velocity of dynamic objects.

```text
a = F / m
```

### Impulse

The engine supports applying impulses to dynamic objects to produce instantaneous changes in velocity.

### Friction

A simplified kinetic-friction model is used to simulate resistance between objects.

### Collision Detection

The engine detects collisions between supported shapes and responds according to the physics model.

---

# 🏗️ Object-Oriented Programming Concepts

This project was designed specifically to demonstrate important **C++ OOP concepts**.

### Encapsulation

Physics object properties and behaviour are organized within dedicated classes.

### Inheritance

Different object/shape types share common interfaces and behaviour through inheritance.

### Polymorphism

Common interfaces allow different shape/object implementations to be handled through base-class references.

### Abstraction

The physics engine separates simulation logic from individual object and shape implementations.

### Operator Overloading

Custom operators are used for vector and mathematical operations.

For example:

```cpp
Vector2D result = velocity + acceleration;
```

### Exception Handling

Custom exception classes are used to handle invalid simulation operations and errors.

### STL

The project makes use of C++ Standard Template Library components for managing simulation data.

### File Handling

Simulation data and demonstration scenes can be stored and loaded using files.

---

# 🧩 System Architecture

The project is divided into several logical components.

```text
                    ┌──────────────────────┐
                    │   Web Interface      │
                    │ HTML / JavaScript    │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │      Web API         │
                    │      WebAPI.cpp      │
                    └──────────┬───────────┘
                               │
                               ▼
             ┌─────────────────────────────────┐
             │       Physics Engine            │
             │                                 │
             │  Gravity                        │
             │  Forces                         │
             │  Collision Detection            │
             │  Integration                    │
             │  Simulation State                │
             └───────────────┬─────────────────┘
                             │
                             ▼
                ┌─────────────────────────┐
                │     Physics Objects     │
                │                         │
                │ Circle                  │
                │ Rectangle               │
                │ Triangle                │
                └─────────────────────────┘
```

---

# 📁 Project Structure

```text
MINI-PHYSICS-PROJECT/
│
├── data/
│   └── Simulation data
│
├── include/
│   ├── Collision.h
│   ├── Exceptions.h
│   ├── FileHandler.h
│   ├── Force.h
│   ├── MathUtils.h
│   ├── ObjectManager.h
│   ├── PhysicsEngine.h
│   ├── PhysicsObject.h
│   ├── Shape.h
│   ├── SimulationState.h
│   ├── Statistics.h
│   ├── TraceRecorder.h
│   ├── Vector2D.h
│   ├── WebAPI.h
│   └── World.h
│
├── src/
│   ├── Collision.cpp
│   ├── FileHandler.cpp
│   ├── Force.cpp
│   ├── PhysicsEngine.cpp
│   ├── PhysicsObject.cpp
│   ├── Shape.cpp
│   ├── SimulationState.cpp
│   ├── TraceRecorder.cpp
│   ├── Vector2D.cpp
│   ├── WebAPI.cpp
│   ├── World.cpp
│   └── main.cpp
│
├── web/
│   ├── examples/
│   ├── index.html
│   ├── physics_engine.js
│   └── physics_engine.wasm
│
├── Makefile
├── build_web.sh
├── start_web.sh
└── README.md
```

---

# 🌐 WebAssembly Integration

The physics calculations are implemented in **C++**.

To make the engine accessible from a web browser, the C++ engine is compiled to **WebAssembly (WASM)** using **Emscripten**.

```text
C++ Physics Engine
        │
        ▼
   Emscripten
        │
        ▼
 WebAssembly (.wasm)
        │
        ▼
 JavaScript API
        │
        ▼
 Browser Interface
```

This allows the browser interface to use the actual C++ physics engine instead of reimplementing the physics calculations in JavaScript.

---

# 🛠️ Technologies Used

| Technology | Purpose |
|------------|---------|
| C++17 | Physics engine |
| Object-Oriented Programming | Software architecture |
| STL | Data structures and utilities |
| Emscripten | C++ → WebAssembly |
| WebAssembly | Browser execution |
| HTML | User interface |
| CSS | Interface styling |
| JavaScript | Browser controls and rendering |
| Makefile | Native build automation |
| Bash | Build and startup scripts |

---

# ▶️ Running the Project

## Native C++ Version

From the project root:

```bash
make
```

Then:

```bash
./bin/physics_engine
```

---

## 🌐 Web Version

### 1. Build the WebAssembly version

Make sure Emscripten is installed and activated.

```bash
./build_web.sh
```

### 2. Start the local web server

```bash
./start_web.sh
```

Or:

```bash
cd web
python3 -m http.server 8080
```

### 3. Open the interface

Open:

```text
http://localhost:8080
```

---

# 🎮 Example Workflow

A typical simulation can be created as follows:

```text
1. Add a dynamic object
        ↓
2. Set its position
        ↓
3. Set velocity
        ↓
4. Configure gravity
        ↓
5. Configure friction
        ↓
6. Run simulation
        ↓
7. Observe movement
        ↓
8. Detect collisions
        ↓
9. Apply impulse
        ↓
10. Observe resulting motion
```

---

# 📊 Real-Time Statistics

The interface provides real-time information including:

- Simulation time
- Total objects
- Dynamic objects
- Static objects
- Kinetic energy
- Collision count

This makes it easier to understand the behaviour of the simulation while it is running.

---

# 🎯 Project Objectives

The main objectives of this project are:

1. Implement a functional 2D physics simulation engine.
2. Apply Object-Oriented Programming principles in a practical system.
3. Implement collision detection and physical interactions.
4. Demonstrate STL and operator overloading.
5. Implement exception and file handling.
6. Compile the C++ engine to WebAssembly.
7. Build an interactive browser-based interface.
8. Visualize physics simulation in real time.

---

# 🔮 Future Improvements

Possible future extensions include:

- More advanced collision response
- Rotational dynamics
- Angular velocity
- Rigid-body physics
- Polygon collision detection
- Spring constraints
- Multiple friction models
- Energy conservation analysis
- Improved physics accuracy
- 3D physics support

---

# 👨‍💻 Project

**Mini Physics Engine**

Developed as a **C++ Object-Oriented Programming project**.

---

## ⭐ Key Highlight

> **The browser interface is powered by the same C++ physics engine compiled to WebAssembly, allowing the core simulation logic to run inside the browser.**
