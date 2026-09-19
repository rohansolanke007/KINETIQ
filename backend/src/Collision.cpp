#include "Collision.h"
#include "Shape.h"

#include <algorithm>
#include <cmath>
#include <iterator>

// -----------------------------------------------------------------------------
// Exact Circle vs Axis-Aligned Rectangle collision.
//
// Rectangles in this project are axis-aligned. Their position represents the
// centre, while width and height define their bounds.
//
// This prevents a large floor rectangle from incorrectly behaving like a
// giant bounding circle.
// -----------------------------------------------------------------------------
static bool circleRectangleCollision(
    const PhysicsObject* circle,
    const PhysicsObject* rectangle,
    Vector2D& normalFromRectangleToCircle,
    double& penetration)
{
    const Circle* circleShape =
        dynamic_cast<const Circle*>(circle->getShape());

    const Rectangle* rectangleShape =
        dynamic_cast<const Rectangle*>(rectangle->getShape());

    if (!circleShape || !rectangleShape) {
        return false;
    }

    const Vector2D circlePos = circle->getPosition();
    const Vector2D rectPos = rectangle->getPosition();

    const double halfWidth = rectangleShape->getWidth() / 2.0;
    const double halfHeight = rectangleShape->getHeight() / 2.0;
    const double radius = circleShape->getRadius();

    // Find the closest point on the rectangle to the circle centre.
    const double closestX =
        std::clamp(
            circlePos.x,
            rectPos.x - halfWidth,
            rectPos.x + halfWidth
        );

    const double closestY =
        std::clamp(
            circlePos.y,
            rectPos.y - halfHeight,
            rectPos.y + halfHeight
        );

    const double dx = circlePos.x - closestX;
    const double dy = circlePos.y - closestY;

    const double distanceSquared = dx * dx + dy * dy;

    // Circle centre is outside the rectangle.
    if (distanceSquared > 1e-12) {

        const double distance = std::sqrt(distanceSquared);

        if (distance >= radius) {
            return false;
        }

        // Direction from rectangle -> circle.
        normalFromRectangleToCircle =
            Vector2D(dx / distance, dy / distance);

        penetration = radius - distance;

        return true;
    }

    // Circle centre is inside the rectangle.
    // Choose the closest rectangle face.
    const double distanceToLeft =
        circlePos.x - (rectPos.x - halfWidth);

    const double distanceToRight =
        (rectPos.x + halfWidth) - circlePos.x;

    const double distanceToBottom =
        circlePos.y - (rectPos.y - halfHeight);

    const double distanceToTop =
        (rectPos.y + halfHeight) - circlePos.y;

    double minDistance = distanceToLeft;

    normalFromRectangleToCircle =
        Vector2D(-1.0, 0.0);

    if (distanceToRight < minDistance) {
        minDistance = distanceToRight;
        normalFromRectangleToCircle =
            Vector2D(1.0, 0.0);
    }

    if (distanceToBottom < minDistance) {
        minDistance = distanceToBottom;
        normalFromRectangleToCircle =
            Vector2D(0.0, -1.0);
    }

    if (distanceToTop < minDistance) {
        minDistance = distanceToTop;
        normalFromRectangleToCircle =
            Vector2D(0.0, 1.0);
    }

    penetration = radius + minDistance;

    return true;
}

// -----------------------------------------------------------------------------
// Exact Rectangle vs Rectangle collision (AABB)
//
// Rectangles in this project are axis-aligned, so collision detection can be
// performed using their left/right/top/bottom bounds.
//
// The returned normal points from rectangle A -> rectangle B.
// -----------------------------------------------------------------------------
static bool rectangleRectangleCollision(
    const PhysicsObject* a,
    const PhysicsObject* b,
    Vector2D& normalFromAToB,
    double& penetration)
{
    const Rectangle* rectA =
        dynamic_cast<const Rectangle*>(a->getShape());

    const Rectangle* rectB =
        dynamic_cast<const Rectangle*>(b->getShape());

    if (!rectA || !rectB) {
        return false;
    }

    const Vector2D posA = a->getPosition();
    const Vector2D posB = b->getPosition();

    const double halfWidthA = rectA->getWidth() / 2.0;
    const double halfHeightA = rectA->getHeight() / 2.0;

    const double halfWidthB = rectB->getWidth() / 2.0;
    const double halfHeightB = rectB->getHeight() / 2.0;

    const double leftA = posA.x - halfWidthA;
    const double rightA = posA.x + halfWidthA;
    const double bottomA = posA.y - halfHeightA;
    const double topA = posA.y + halfHeightA;

    const double leftB = posB.x - halfWidthB;
    const double rightB = posB.x + halfWidthB;
    const double bottomB = posB.y - halfHeightB;
    const double topB = posB.y + halfHeightB;

    // Check for separation on either axis.
    if (rightA <= leftB ||
        leftA >= rightB ||
        topA <= bottomB ||
        bottomA >= topB) {
        return false;
    }

    // Calculate overlap on each axis.
    const double overlapX =
        std::min(rightA, rightB) - std::max(leftA, leftB);

    const double overlapY =
        std::min(topA, topB) - std::max(bottomA, bottomB);

    // Resolve along the axis with the smallest penetration.
    if (overlapX < overlapY) {

        penetration = overlapX;

        if (posB.x >= posA.x) {
            normalFromAToB = Vector2D(1.0, 0.0);
        } else {
            normalFromAToB = Vector2D(-1.0, 0.0);
        }

    } else {

        penetration = overlapY;

        if (posB.y >= posA.y) {
            normalFromAToB = Vector2D(0.0, 1.0);
        } else {
            normalFromAToB = Vector2D(0.0, -1.0);
        }
    }

    return true;
}

// -----------------------------------------------------------------------------
// Exact Rectangle vs Rectangle collision (AABB)
// -----------------------------------------------------------------------------




// -----------------------------------------------------------------------------
// Collision detection
// -----------------------------------------------------------------------------
std::vector<Collision> CollisionManager::detectCollisions(
    const ObjectManager<PhysicsObject>& objects)
{
    std::vector<Collision> results;

    std::set<std::pair<int, int>> testedPairs;

    const auto& all = objects.getAll();

    for (auto itA = all.begin(); itA != all.end(); ++itA) {

        for (auto itB = std::next(itA);
             itB != all.end();
             ++itB) {

            PhysicsObject* a = itA->second.get();
            PhysicsObject* b = itB->second.get();

            const int idA = a->getId();
            const int idB = b->getId();

            const std::pair<int, int> key =
                (idA < idB)
                    ? std::make_pair(idA, idB)
                    : std::make_pair(idB, idA);

            if (testedPairs.count(key)) {
                continue;
            }

            testedPairs.insert(key);

            // Two static objects cannot produce meaningful motion.
            if (a->isStatic() && b->isStatic()) {
                continue;
            }

            Collision collision;
            bool collided = false;

            // -----------------------------------------------------------------
            // Circle vs Rectangle
            // -----------------------------------------------------------------
            if (a->getShape()->getType() == ShapeType::CIRCLE &&
                b->getShape()->getType() == ShapeType::RECTANGLE) {

                Vector2D normalRectToCircle;
                double penetration = 0.0;

                collided = circleRectangleCollision(
                    a,
                    b,
                    normalRectToCircle,
                    penetration
                );

                if (collided) {

                    collision.idA = idA;
                    collision.idB = idB;

                    // We need the normal from A -> B.
                    // A is circle, B is rectangle.
                    collision.normal =
                        normalRectToCircle * -1.0;

                    collision.penetration = penetration;
                }
            }

            // -----------------------------------------------------------------
            // Rectangle vs Circle
            // -----------------------------------------------------------------
            else if (
                a->getShape()->getType() == ShapeType::RECTANGLE &&
                b->getShape()->getType() == ShapeType::CIRCLE
            ) {

                Vector2D normalRectToCircle;
                double penetration = 0.0;

                collided = circleRectangleCollision(
                    b,
                    a,
                    normalRectToCircle,
                    penetration
                );

                if (collided) {

                    collision.idA = idA;
                    collision.idB = idB;

                    // A is rectangle, B is circle.
                    // normalRectToCircle is already A -> B.
                    collision.normal =
                        normalRectToCircle;

                    collision.penetration = penetration;
                }
            }
            // -----------------------------------------------------------------
            // Rectangle vs Rectangle
            // -----------------------------------------------------------------
            else if (
                a->getShape()->getType() == ShapeType::RECTANGLE &&
                b->getShape()->getType() == ShapeType::RECTANGLE
            ) {

                Vector2D normalAtoB;
                double penetration = 0.0;

                collided = rectangleRectangleCollision(
                    a,
                    b,
                    normalAtoB,
                    penetration
                );

                if (collided) {

                    collision.idA = idA;
                    collision.idB = idB;

                    collision.normal = normalAtoB;
                    collision.penetration = penetration;
                }
            }


            // -----------------------------------------------------------------
            // All other shape combinations continue using the project's
            // simplified bounding-circle collision model.
            // -----------------------------------------------------------------
            else {

                const double dist =
                    a->getPosition().distanceTo(
                        b->getPosition()
                    );

                const double combinedRadius =
                    a->getShape()->getBoundingRadius() +
                    b->getShape()->getBoundingRadius();

                if (dist < combinedRadius) {

                    collided = true;

                    collision.idA = idA;
                    collision.idB = idB;

                    Vector2D diff =
                        b->getPosition() -
                        a->getPosition();

                    collision.normal =
                        (dist > 1e-9)
                            ? diff.normalized()
                            : Vector2D(1.0, 0.0);

                    collision.penetration =
                        combinedRadius - dist;
                }
            }

            if (collided) {
                results.push_back(collision);
            }
        }
    }

    return results;
}


// -----------------------------------------------------------------------------
// Collision resolution
// -----------------------------------------------------------------------------
void CollisionManager::resolveCollisions(
    ObjectManager<PhysicsObject>& objects,
    const std::vector<Collision>& collisions)
{
    for (const auto& c : collisions) {

        PhysicsObject* a =
            objects.find(c.idA);

        PhysicsObject* b =
            objects.find(c.idB);

        if (!a || !b) {
            continue;
        }

        // ---------------------------------------------------------------------
        // 1. Positional correction
        // ---------------------------------------------------------------------
        if (!a->isStatic() && !b->isStatic()) {

            Vector2D correction =
                c.normal * (c.penetration / 2.0);

            a->setPosition(
                a->getPosition() - correction
            );

            b->setPosition(
                b->getPosition() + correction
            );

        }
        else if (a->isStatic() && !b->isStatic()) {

            b->setPosition(
                b->getPosition() +
                c.normal * c.penetration
            );

        }
        else if (!a->isStatic() && b->isStatic()) {

            a->setPosition(
                a->getPosition() -
                c.normal * c.penetration
            );
        }

        // ---------------------------------------------------------------------
        // 2. Simple velocity response
        // ---------------------------------------------------------------------
        const double restitution = 0.6;

        // Dynamic vs Dynamic
        if (!a->isStatic() && !b->isStatic()) {

            Vector2D relVel =
                b->getVelocity() -
                a->getVelocity();

            const double velAlongNormal =
                relVel.x * c.normal.x +
                relVel.y * c.normal.y;

            // Already separating.
            if (velAlongNormal > 0) {
                continue;
            }

            const double impulseMag =
                -(1.0 + restitution) *
                velAlongNormal / 2.0;

            Vector2D impulse =
                c.normal * impulseMag;

            a->setVelocity(
                a->getVelocity() - impulse
            );

            b->setVelocity(
                b->getVelocity() + impulse
            );
        }

        // Static A vs Dynamic B
        else if (a->isStatic() && !b->isStatic()) {

            const double velAlongNormal =
                b->getVelocity().x * c.normal.x +
                b->getVelocity().y * c.normal.y;

            if (velAlongNormal < 0) {

                Vector2D reflected =
                    b->getVelocity() -
                    c.normal *
                    ((1.0 + restitution) *
                     velAlongNormal);

                b->setVelocity(reflected);
            }
        }

        // Dynamic A vs Static B
        else if (!a->isStatic() && b->isStatic()) {

            const Vector2D normalAtoB =
                c.normal;

            const double velAlongNormal =
                a->getVelocity().x * normalAtoB.x +
                a->getVelocity().y * normalAtoB.y;

            if (velAlongNormal > 0) {
                continue;
            }

            Vector2D reflected =
                a->getVelocity() -
                normalAtoB *
                ((1.0 + restitution) *
                 velAlongNormal);

            a->setVelocity(reflected);
        }
    }
}
