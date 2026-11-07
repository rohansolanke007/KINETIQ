#ifndef OSCILLATOR_SIMULATION_H
#define OSCILLATOR_SIMULATION_H

#include "SeriesRecorder.h"
#include "Simulation.h"

#include <cmath>
#include <limits>
#include <string>
#include <utility>
#include <vector>

// ZeroCrossingTracker
// ----------------------------------------------------------------
// Measures an oscillation period from the SIMULATION (not from a formula).
// Every time the watched value changes sign, the crossing instant is found by
// linear interpolation between the two steps. Two crossings in the SAME
// direction are one full period apart, so period() = t[n] - t[n-2].
// Near a zero crossing the restoring force is ~0, so linear interpolation
// is extremely accurate.
// ----------------------------------------------------------------
class ZeroCrossingTracker {
public:
    void reset() {
        havePrevious_ = false;
        count_ = 0;
        period_ = std::numeric_limits<double>::quiet_NaN();
    }

    void observe(double time, double value) {
        if (havePrevious_ && previousValue_ != 0.0 &&
            ((previousValue_ > 0.0) != (value > 0.0) || value == 0.0)) {
            const double span = previousValue_ - value;
            const double frac = span != 0.0 ? previousValue_ / span : 0.0;
            const double crossing = previousTime_ + frac * (time - previousTime_);
            older_ = old_;
            old_ = latest_;
            latest_ = crossing;
            ++count_;
            if (count_ >= 3) period_ = latest_ - older_;
        }
        havePrevious_ = true;
        previousTime_ = time;
        previousValue_ = value;
    }

    // NaN until three crossings have been seen.
    double period() const { return period_; }

private:
    bool havePrevious_ = false;
    double previousTime_ = 0.0;
    double previousValue_ = 0.0;
    double latest_ = 0.0, old_ = 0.0, older_ = 0.0;
    int count_ = 0;
    double period_ = std::numeric_limits<double>::quiet_NaN();
};

// OscillatorSimulation
// ----------------------------------------------------------------
// Intermediate abstract class for periodic systems (pendulum, spring-mass).
// It owns what they share: a SeriesRecorder (composition) for graphs, and the
// measured period. Each concrete subclass still writes its OWN update():
// its own equations and numerical method.
//
//   Simulation -> OscillatorSimulation -> PendulumSimulation
//                                      -> SHMSimulation
// ----------------------------------------------------------------
class OscillatorSimulation : public Simulation {
public:
    static constexpr std::size_t kSeriesCapacity = 6000;

    std::string seriesJSON(std::size_t maxRows) const override { return recorder_.toJSON(maxRows); }
    double measuredPeriod() const { return crossings_.period(); }

protected:
    OscillatorSimulation(std::vector<std::string> channels, std::vector<std::string> units)
        : Simulation(), recorder_(std::move(channels), std::move(units), kSeriesCapacity) {}

    // Helpers for subclasses' update() and initialize().
    void clearRecording() {
        recorder_.clear();
        crossings_.reset();
    }
    void trackCrossing(double primaryCoordinate) { crossings_.observe(time(), primaryCoordinate); }
    bool sampleDue() const { return recorder_.due(time()); }
    void pushSample(const std::vector<double>& row) { recorder_.push(time(), row); }

private:
    SeriesRecorder recorder_;
    ZeroCrossingTracker crossings_;
};

#endif // OSCILLATOR_SIMULATION_H
