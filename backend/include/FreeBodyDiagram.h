#ifndef FREE_BODY_DIAGRAM_H
#define FREE_BODY_DIAGRAM_H

#include "Vector2D.h"

#include <string>
#include <vector>

// Kinds of force a free-body diagram can contain.
enum class ForceKind { Gravity, Normal, Friction, Applied, Tension, Spring };

const char* forceKindName(ForceKind kind);

// One force acting on a body, expressed in WORLD coordinates:
//   x grows to the right, y grows UP, so gravity is (0, -m g).
// `isComponent` marks a vector that is a piece of another force (for example
// the part of the weight along an incline). Components are drawn but are NOT
// added into the resultant, because that would count the force twice.
struct ForceVector {
    std::string name;   // e.g. "Weight"
    std::string label;  // symbol shown on the diagram, e.g. "W = mg"
    ForceKind kind;
    Vector2D value;
    bool isComponent = false;
};

// FreeBodyDiagram
// ----------------------------------------------------------------
// Collects the forces on one body and computes their vector sum. Every
// simulation builds one from its own physics (composition), so the diagram
// is derived from the same numbers that drive the motion, never drawn
// separately in the browser.
// ----------------------------------------------------------------
class FreeBodyDiagram {
public:
    void add(const ForceVector& force) { forces_.push_back(force); }
    void clear() { forces_.clear(); }
    const std::vector<ForceVector>& forces() const { return forces_; }

    // Vector sum of the real forces (components excluded).
    Vector2D resultant() const;
    // True when the real forces cancel (net force ~ 0).
    bool inEquilibrium(double tolerance = 1e-6) const;

    std::string toJSON() const;

private:
    std::vector<ForceVector> forces_;
};

#endif // FREE_BODY_DIAGRAM_H
