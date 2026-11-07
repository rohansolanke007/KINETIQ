#ifndef JSON_UTIL_H
#define JSON_UTIL_H

#include <cmath>
#include <iomanip>
#include <sstream>
#include <string>

// Tiny helpers for emitting JSON snapshots. JSON is only the transport
// between C++ and the browser; no physics is done on the JSON side.
namespace JsonUtil {

// Formats a number for JSON. NaN and infinity are not valid JSON, so they
// become null (the frontend shows "—" for them).
inline std::string num(double value) {
    if (!std::isfinite(value)) return "null";
    // Avoid printing "-0".
    if (value == 0.0) value = 0.0;
    std::ostringstream out;
    out << std::setprecision(12) << value;
    return out.str();
}

inline std::string quote(const std::string& text) {
    std::string out = "\"";
    for (char c : text) {
        if (c == '"' || c == '\\') out += '\\';
        out += c;
    }
    out += '"';
    return out;
}

} // namespace JsonUtil

#endif // JSON_UTIL_H
