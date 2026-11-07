#include "Simulation.h"
#include "Exceptions.h"
#include "JsonUtil.h"

#include <cmath>
#include <sstream>

namespace {
// A frame longer than this (tab was hidden, debugger paused, ...) is clipped
// so the physics never tries to "catch up" with a huge burst of steps.
constexpr double kMaxAdvanceSeconds = 0.25;
constexpr double kFrameSeconds = 1.0 / 60.0;
}

Simulation::Simulation(double fixedDt)
    : fixedDt_(fixedDt > 0.0 ? fixedDt : 1.0 / 240.0), time_(0.0), accumulator_(0.0) {}

void Simulation::resetClock() {
    time_ = 0.0;
    accumulator_ = 0.0;
}

void Simulation::setParameter(const std::string& name, double value) {
    for (const ParameterSpec& spec : parameterSpecs()) {
        if (spec.name != name) continue;
        if (!std::isfinite(value) || value < spec.minValue || value > spec.maxValue) {
            std::ostringstream msg;
            msg << spec.label << " must be between " << spec.minValue << " and " << spec.maxValue
                << (spec.unit.empty() ? "" : " " + spec.unit) << ".";
            throw InvalidSimulationException(msg.str());
        }
        applyParameter(name, value);
        reset();
        return;
    }
    throw InvalidSimulationException("unknown parameter '" + name + "' for " + typeName() + ".");
}

void Simulation::advance(double seconds) {
    if (!std::isfinite(seconds) || seconds <= 0.0) return;
    if (seconds > kMaxAdvanceSeconds) seconds = kMaxAdvanceSeconds;
    accumulator_ += seconds;
    while (accumulator_ >= fixedDt_) {
        if (isFinished()) {
            accumulator_ = 0.0;
            return;
        }
        update(fixedDt_);
        accumulator_ -= fixedDt_;
    }
}

void Simulation::stepFrame() {
    // Exactly one frame worth of fixed steps, independent of the accumulator.
    const int steps = static_cast<int>(std::lround(kFrameSeconds / fixedDt_));
    for (int i = 0; i < steps && !isFinished(); ++i) update(fixedDt_);
}

std::string Simulation::parametersJSON() const {
    using namespace JsonUtil;
    std::ostringstream out;
    out << "[";
    bool first = true;
    for (const ParameterSpec& spec : parameterSpecs()) {
        if (!first) out << ",";
        first = false;
        out << "{\"name\":" << quote(spec.name) << ",\"label\":" << quote(spec.label)
            << ",\"unit\":" << quote(spec.unit) << ",\"min\":" << num(spec.minValue)
            << ",\"max\":" << num(spec.maxValue) << ",\"step\":" << num(spec.step)
            << ",\"default\":" << num(spec.defaultValue)
            << ",\"value\":" << num(getParameter(spec.name)) << "}";
    }
    out << "]";
    return out.str();
}

std::string Simulation::forcesJSON() const {
    FreeBodyDiagram diagram;
    for (const ForceVector& f : forces()) diagram.add(f);
    return diagram.toJSON();
}
