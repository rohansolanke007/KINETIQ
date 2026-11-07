#ifndef MATH_UTILS_H
#define MATH_UTILS_H

#include <cmath>
#include <vector>
#include <numeric>

// MathUtils
// ----------------------------------------------------------------
// Small, genuinely reused FUNCTION TEMPLATES (as opposed to the
// ObjectManager CLASS TEMPLATE). Kept free-standing since they are
// generic numeric helpers, not tied to any one class's responsibility.
// ----------------------------------------------------------------

// Clamps 'value' into the inclusive range [minVal, maxVal].
// Used e.g. to keep a friction coefficient within a sane [0,1] range,
// and could equally be used for any other bounded numeric quantity.
template <typename T>
T clampValue(T value, T minVal, T maxVal) {
    if (value < minVal) return minVal;
    if (value > maxVal) return maxVal;
    return value;
}

// Computes the arithmetic mean of a collection of numeric values.
// Used e.g. to report the average speed of all objects in the world.
template <typename T>
double average(const std::vector<T>& values) {
    if (values.empty()) return 0.0;
    T sum = std::accumulate(values.begin(), values.end(), T());
    return static_cast<double>(sum) / values.size();
}

// Relative change of an energy that should be conserved: (E - E0) / |E0|.
// Returns 0 when there was no energy to begin with.
inline double relativeDrift(double current, double initial) {
    return initial != 0.0 ? (current - initial) / std::fabs(initial) : 0.0;
}

// Complete elliptic integral of the first kind, K(k), for 0 <= k < 1, computed
// with the arithmetic-geometric mean: K(k) = pi / (2 * AGM(1, sqrt(1 - k^2))).
// Gives the EXACT large-amplitude pendulum period T = 4 sqrt(L/g) K(sin(theta0/2)).
inline double ellipticK(double k) {
    double a = 1.0;
    double b = std::sqrt(1.0 - k * k);
    for (int i = 0; i < 40 && std::fabs(a - b) > 1e-15 * a; ++i) {
        const double next = 0.5 * (a + b);
        b = std::sqrt(a * b);
        a = next;
    }
    return 3.14159265358979323846 / (2.0 * a);
}

#endif // MATH_UTILS_H
