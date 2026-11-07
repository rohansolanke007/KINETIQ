#include "SeriesRecorder.h"
#include "JsonUtil.h"

#include <cmath>
#include <sstream>

SeriesRecorder::SeriesRecorder(std::vector<std::string> channels, std::vector<std::string> units,
                               std::size_t capacity, double sampleInterval)
    : channels_(std::move(channels)), units_(std::move(units)),
      interval_(sampleInterval > 0.0 ? sampleInterval : 1.0 / 60.0), nextSample_(0.0), rows_(capacity) {}

void SeriesRecorder::clear() {
    rows_.clear();
    nextSample_ = 0.0;
}

void SeriesRecorder::push(double time, const std::vector<double>& row) {
    rows_.push_back(row);
    nextSample_ = (std::floor(time / interval_ + 1e-9) + 1.0) * interval_;
}

std::string SeriesRecorder::toJSON(std::size_t maxRows) const {
    using namespace JsonUtil;
    std::ostringstream out;
    out << "{\"channels\":[";
    for (std::size_t i = 0; i < channels_.size(); ++i) out << (i ? "," : "") << quote(channels_[i]);
    out << "],\"units\":[";
    for (std::size_t i = 0; i < units_.size(); ++i) out << (i ? "," : "") << quote(units_[i]);
    out << "],\"rows\":[";
    const std::size_t first = (maxRows > 0 && rows_.size() > maxRows) ? rows_.size() - maxRows : 0;
    for (std::size_t i = first; i < rows_.size(); ++i) {
        const std::vector<double>& row = rows_[i];
        if (i > first) out << ",";
        out << "[";
        for (std::size_t c = 0; c < row.size(); ++c) out << (c ? "," : "") << num(row[c]);
        out << "]";
    }
    out << "]}";
    return out.str();
}
