#ifndef INTEGRATORS_H
#define INTEGRATORS_H

#include <array>
#include <cstddef>

// Numerical integrators
// ----------------------------------------------------------------
// FUNCTION TEMPLATES: one fourth-order Runge-Kutta step that works for ANY
// state size N and ANY derivative functor. The pendulum uses it with
// N = 2 (angle, angular velocity); a future coupled system could use N = 4.
//
// f(t, y) must return dy/dt as std::array<double, N>.
//
// Error per step is O(h^5); the global error is O(h^4), which is why RK4
// keeps a nonlinear pendulum's energy essentially constant.
// ----------------------------------------------------------------
template <std::size_t N, typename Derivative>
std::array<double, N> rk4Step(const std::array<double, N>& y, double t, double h, Derivative&& f) {
    auto addScaled = [](const std::array<double, N>& a, const std::array<double, N>& b, double s) {
        std::array<double, N> out{};
        for (std::size_t i = 0; i < N; ++i) out[i] = a[i] + s * b[i];
        return out;
    };
    const std::array<double, N> k1 = f(t, y);
    const std::array<double, N> k2 = f(t + 0.5 * h, addScaled(y, k1, 0.5 * h));
    const std::array<double, N> k3 = f(t + 0.5 * h, addScaled(y, k2, 0.5 * h));
    const std::array<double, N> k4 = f(t + h, addScaled(y, k3, h));
    std::array<double, N> out{};
    for (std::size_t i = 0; i < N; ++i) {
        out[i] = y[i] + (h / 6.0) * (k1[i] + 2.0 * k2[i] + 2.0 * k3[i] + k4[i]);
    }
    return out;
}

#endif // INTEGRATORS_H
