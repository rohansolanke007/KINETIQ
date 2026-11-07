#include "FreeBodyDiagram.h"
#include "JsonUtil.h"

#include <cmath>
#include <sstream>

const char* forceKindName(ForceKind kind) {
    switch (kind) {
        case ForceKind::Gravity: return "gravity";
        case ForceKind::Normal: return "normal";
        case ForceKind::Friction: return "friction";
        case ForceKind::Applied: return "applied";
        case ForceKind::Tension: return "tension";
        case ForceKind::Spring: return "spring";
    }
    return "applied";
}

Vector2D FreeBodyDiagram::resultant() const {
    Vector2D sum(0.0, 0.0);
    for (const ForceVector& f : forces_) {
        if (!f.isComponent) sum += f.value;
    }
    return sum;
}

bool FreeBodyDiagram::inEquilibrium(double tolerance) const { return resultant().magnitude() <= tolerance; }

std::string FreeBodyDiagram::toJSON() const {
    using namespace JsonUtil;
    constexpr double kPi = 3.14159265358979323846;
    std::ostringstream out;
    out << "{\"forces\":[";
    bool first = true;
    for (const ForceVector& f : forces_) {
        if (!first) out << ",";
        first = false;
        out << "{\"name\":" << quote(f.name) << ",\"label\":" << quote(f.label)
            << ",\"kind\":" << quote(forceKindName(f.kind)) << ",\"x\":" << num(f.value.x)
            << ",\"y\":" << num(f.value.y) << ",\"magnitude\":" << num(f.value.magnitude())
            << ",\"angleDeg\":" << num(std::atan2(f.value.y, f.value.x) * 180.0 / kPi)
            << ",\"component\":" << (f.isComponent ? "true" : "false") << "}";
    }
    const Vector2D r = resultant();
    out << "],\"resultant\":{\"x\":" << num(r.x) << ",\"y\":" << num(r.y)
        << ",\"magnitude\":" << num(r.magnitude()) << "},\"equilibrium\":"
        << (inEquilibrium() ? "true" : "false") << "}";
    return out.str();
}
