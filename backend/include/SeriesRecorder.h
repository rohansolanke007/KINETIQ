#ifndef SERIES_RECORDER_H
#define SERIES_RECORDER_H

#include "TimeSeries.h"

#include <cstddef>
#include <string>
#include <vector>

// SeriesRecorder
// ----------------------------------------------------------------
// Records named channels (t, x, v, ...) at a fixed rate in a bounded ring
// buffer and serialises them as JSON for graphs and CSV export. Every
// Simulation OWNS one (composition) instead of re-implementing recording.
// ----------------------------------------------------------------
class SeriesRecorder {
public:
    SeriesRecorder(std::vector<std::string> channels, std::vector<std::string> units,
                   std::size_t capacity = 6000, double sampleInterval = 1.0 / 60.0);

    void clear();
    // True once simulated time has reached the next sampling instant.
    bool due(double time) const { return time >= nextSample_; }
    // Stores one row (same order as the channel names) and schedules the next sample.
    void push(double time, const std::vector<double>& row);

    std::size_t size() const { return rows_.size(); }
    const std::vector<std::string>& channels() const { return channels_; }

    // maxRows = 0 returns everything; otherwise only the most recent rows.
    std::string toJSON(std::size_t maxRows) const;

private:
    std::vector<std::string> channels_;
    std::vector<std::string> units_;
    double interval_;
    double nextSample_;
    TimeSeries<std::vector<double>> rows_;
};

#endif // SERIES_RECORDER_H
