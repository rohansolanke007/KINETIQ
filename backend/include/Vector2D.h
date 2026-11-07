#ifndef VECTOR2D_H
#define VECTOR2D_H

#include <iostream>
#include <cmath>

// Vector2D
// ----------------------------------------------------------------
// Represents a 2D mathematical vector used throughout the engine
// for position, velocity, acceleration and force.
//
// OOP concepts demonstrated:
//   - Encapsulation (x, y kept simple/public here since Vector2D is
//     treated as a lightweight math "value type", similar to how
//     the standard library treats std::complex)
//   - Operator overloading (+, -, unary -, *, /, +=, -=, *=, /=,
//     scalar * v, ==, !=, <<, >>)
//   - Friend functions (for stream operators)
// ----------------------------------------------------------------
class Vector2D {
public:
    double x;
    double y;

    Vector2D(double x = 0.0, double y = 0.0);

    Vector2D operator+(const Vector2D& other) const;
    Vector2D operator-(const Vector2D& other) const;
    Vector2D operator*(double scalar) const;   // Vector2D * scalar
    Vector2D operator/(double scalar) const;   // Vector2D / scalar
    bool     operator==(const Vector2D& other) const;
    bool     operator!=(const Vector2D& other) const;

    Vector2D operator-() const;                // unary minus: -v

    Vector2D& operator+=(const Vector2D& other);
    Vector2D& operator-=(const Vector2D& other);
    Vector2D& operator*=(double scalar);
    Vector2D& operator/=(double scalar);

    // scalar * Vector2D (the commutative partner of operator*)
    friend Vector2D operator*(double scalar, const Vector2D& v);

    double dot(const Vector2D& other) const;   // a . b
    double cross(const Vector2D& other) const; // z-component of a x b
    double angle() const;                      // direction in radians, atan2(y, x)
    Vector2D rotated(double radians) const;    // counter-clockwise rotation

    double magnitude() const;
    double magnitudeSquared() const;
    double distanceTo(const Vector2D& other) const;
    Vector2D normalized() const; // returns a unit vector in the same direction

    // Stream operators - declared as friends so they can access
    // private-like internals uniformly and be called as free functions
    // (required syntax for operator<< / operator>> with std::ostream/istream).
    friend std::ostream& operator<<(std::ostream& out, const Vector2D& v);
    friend std::istream& operator>>(std::istream& in, Vector2D& v);
};

#endif // VECTOR2D_H
