#ifndef WEB_API_H
#define WEB_API_H

#include <string>

// Browser-facing facade for the existing C++ physics engine.
// The console application remains unchanged; this API is compiled
// separately to WebAssembly with Emscripten and called by web/app.js.
namespace WebAPI {
    void reset();
    void pause();
    void resume();
    bool isPaused();

    void setTimeStep(double dt);
    double getTimeStep();

    void setGravity(double g);
    void disableGravity();
    void setFriction(double coefficient);
    void disableFriction();

    int createCircle(bool isStatic, double mass, double x, double y,
                     double radius, double vx, double vy);
    int createRectangle(bool isStatic, double mass, double x, double y,
                        double width, double height, double vx, double vy);
    int createTriangle(bool isStatic, double mass, double x, double y,
                       double base, double height, double vx, double vy);

    bool removeObject(int id);
    void setObjectPosition(int id, double x, double y);
    void setObjectVelocity(int id, double vx, double vy);
    void applyImpulse(int id, double fx, double fy);

    void step(int count = 1);
    bool undo();

    // Returns a compact JSON snapshot of the CURRENT C++ World state.
    // JSON is transport only; it is not a recorded trace and the browser
    // never uses it to simulate physics.
    std::string getStateJSON();

    // Coefficients of restitution (0..1): body-body collisions and walls.
    // 1 conserves kinetic energy, 0 removes the normal-direction bounce.
    void setRestitution(double e);
    void setWallRestitution(double e);

    // Energy and momentum of the sandbox, computed by the C++ engine:
    // totals plus one entry per dynamic body. PE = m g y, measured from y = 0.
    std::string getAnalysisJSON();
    // Time series of the same totals (t, ke, pe, e, px, py, p), recorded at
    // every step. maxRows = 0 returns everything.
    std::string getAnalysisSeriesJSON(int maxRows);

    // ---- Dedicated simulations (Simulation hierarchy) -------------
    // Independent of the sandbox world above. Mutating calls return an
    // empty string on success or a human readable error message, because
    // C++ exceptions reach JavaScript only as opaque numbers.
    std::string simCreate(const std::string& type);
    void simDestroy();
    std::string simSetParameter(const std::string& name, double value);
    std::string simReset();
    void simAdvance(double seconds);     // fixed-timestep driver
    void simStepFrame();                 // one 1/60 s frame
    std::string simStateJSON();          // "null" when nothing is selected
    std::string simInfoJSON();
    std::string simSeriesJSON(int maxRows);  // 0 = all rows
    std::string simForcesJSON();             // free-body diagram of the active simulation

    // Free-body diagram of one sandbox body: the gravity and friction forces
    // the engine is applying to it right now. "null" for an unknown/static id.
    std::string getBodyForcesJSON(int id);
}

#endif // WEB_API_H
