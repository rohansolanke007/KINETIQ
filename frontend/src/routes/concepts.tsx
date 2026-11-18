import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Panel } from "@/components/physics/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/concepts")({
  head: () => ({
    meta: [
      {
        title: "Physics Concepts — KINETIQ",
      },
      {
        name: "description",
        content:
          "A comprehensive physics formula reference covering mechanics, motion, energy, momentum and vectors.",
      },
    ],
  }),
  component: FormulaLibraryPage,
});

type FormulaVariable = {
  symbol: string;
  meaning: string;
  unit: string;
  dimension: string;
};

type Formula = {
  id: string;
  name: string;
  formula: string;
  explanation: string;
  physicalMeaning: string;
  whenToUse: string;
  variables: FormulaVariable[];
  dimensions: string;
  siUnit: string;
};

type FormulaCategory = {
  name: string;
  description: string;
  formulas: Formula[];
};

const FORMULA_CATEGORIES: FormulaCategory[] = [
  {
    name: "KINEMATICS",
    description:
      "Motion described through displacement, velocity and acceleration under uniform acceleration.",
    formulas: [
      {
        id: "kin-1",
        name: "First Equation of Motion",
        formula: "v = u + at",
        explanation:
          "The first equation of motion relates the initial velocity, final velocity, acceleration and time of an object undergoing uniformly accelerated motion. It describes how the velocity changes over a known time interval.",
        physicalMeaning:
          "The equation shows that the change in velocity is equal to acceleration multiplied by the time for which the acceleration acts. Positive acceleration increases velocity, while negative acceleration reduces it.",
        whenToUse:
          "Use this equation when initial velocity, acceleration and time are known and you need to find final velocity. It is valid only when acceleration remains constant.",
        variables: [
          {
            symbol: "u",
            meaning: "Initial velocity",
            unit: "m/s",
            dimension: "LT⁻¹",
          },
          {
            symbol: "v",
            meaning: "Final velocity",
            unit: "m/s",
            dimension: "LT⁻¹",
          },
          {
            symbol: "a",
            meaning: "Constant acceleration",
            unit: "m/s²",
            dimension: "LT⁻²",
          },
          {
            symbol: "t",
            meaning: "Time interval",
            unit: "s",
            dimension: "T",
          },
        ],
        dimensions: "LT⁻¹",
        siUnit: "m/s",
      },

      {
        id: "kin-2",
        name: "Displacement",
        formula: "s = ut + ½at²",
        explanation:
          "This equation determines the displacement of an object during uniformly accelerated motion. It combines the displacement produced by the initial velocity with the additional displacement produced by acceleration.",
        physicalMeaning:
          "The term ut represents the distance the object would cover if it continued moving at its initial velocity. The term ½at² represents the additional displacement caused by constant acceleration.",
        whenToUse:
          "Use this equation when initial velocity, acceleration and time are known and displacement needs to be calculated. It is especially useful when the final velocity is not known.",
        variables: [
          {
            symbol: "s",
            meaning: "Displacement",
            unit: "m",
            dimension: "L",
          },
          {
            symbol: "u",
            meaning: "Initial velocity",
            unit: "m/s",
            dimension: "LT⁻¹",
          },
          {
            symbol: "a",
            meaning: "Constant acceleration",
            unit: "m/s²",
            dimension: "LT⁻²",
          },
          {
            symbol: "t",
            meaning: "Time interval",
            unit: "s",
            dimension: "T",
          },
        ],
        dimensions: "L",
        siUnit: "m",
      },

      {
        id: "kin-3",
        name: "Velocity–Displacement Relation",
        formula: "v² = u² + 2as",
        explanation:
          "The velocity–displacement equation connects initial velocity, final velocity, acceleration and displacement without requiring time. It is one of the three standard equations of uniformly accelerated motion.",
        physicalMeaning:
          "The equation describes how the square of velocity changes as an object travels through a displacement while experiencing constant acceleration. It is useful when the duration of motion is unknown.",
        whenToUse:
          "Use this equation when time is not available but velocity, acceleration and displacement are involved. It can be rearranged to calculate final velocity, initial velocity, acceleration or displacement.",
        variables: [
          {
            symbol: "u",
            meaning: "Initial velocity",
            unit: "m/s",
            dimension: "LT⁻¹",
          },
          {
            symbol: "v",
            meaning: "Final velocity",
            unit: "m/s",
            dimension: "LT⁻¹",
          },
          {
            symbol: "a",
            meaning: "Constant acceleration",
            unit: "m/s²",
            dimension: "LT⁻²",
          },
          {
            symbol: "s",
            meaning: "Displacement",
            unit: "m",
            dimension: "L",
          },
        ],
        dimensions: "L²T⁻²",
        siUnit: "m²/s²",
      },

      {
        id: "kin-4",
        name: "Average Velocity",
        formula: "v̄ = ½(u + v)",
        explanation:
          "For uniformly accelerated motion, the average velocity is equal to the arithmetic mean of the initial and final velocities. It provides the effective constant velocity that would produce the same displacement over the same time interval.",
        physicalMeaning:
          "When acceleration is constant, velocity changes at a uniform rate. Therefore, the average of the starting and ending velocities represents the velocity that can be used to determine total displacement over the interval.",
        whenToUse:
          "Use this relation when initial and final velocities are known and the motion has constant acceleration. It is useful for calculating displacement through s = v̄t.",
        variables: [
          {
            symbol: "v̄",
            meaning: "Average velocity",
            unit: "m/s",
            dimension: "LT⁻¹",
          },
          {
            symbol: "u",
            meaning: "Initial velocity",
            unit: "m/s",
            dimension: "LT⁻¹",
          },
          {
            symbol: "v",
            meaning: "Final velocity",
            unit: "m/s",
            dimension: "LT⁻¹",
          },
        ],
        dimensions: "LT⁻¹",
        siUnit: "m/s",
      },
    ],
  },

  {
    name: "DYNAMICS",
    description: "Forces, mass, acceleration and resistance to motion.",
    formulas: [
      {
        id: "dyn-1",
        name: "Newton's Second Law",
        formula: "F = ma",
        explanation:
          "Newton's second law states that the net external force acting on an object equals its mass multiplied by its acceleration. It quantitatively connects the cause of motion (net force) with the resulting change in velocity.",
        physicalMeaning:
          "For a fixed mass, increasing the net force increases acceleration proportionally. For the same force, a more massive object accelerates less. The equation uses the net force, which is the vector sum of all forces acting on the body.",
        whenToUse:
          "Use this equation to calculate net force, mass or acceleration when the other two quantities are known. It applies in its usual form in an inertial reference frame.",
        variables: [
          { symbol: "F", meaning: "Net force", unit: "N", dimension: "MLT⁻²" },
          { symbol: "m", meaning: "Mass", unit: "kg", dimension: "M" },
          { symbol: "a", meaning: "Acceleration", unit: "m/s²", dimension: "LT⁻²" },
        ],
        dimensions: "MLT⁻²",
        siUnit: "N (newton)",
      },
      {
        id: "dyn-2",
        name: "Weight",
        formula: "W = mg",
        explanation:
          "Weight is the gravitational force exerted on an object. Near Earth's surface, it is calculated by multiplying the object's mass by the local gravitational acceleration.",
        physicalMeaning:
          "Mass measures the amount of matter and remains the same in different locations. Weight depends on gravitational acceleration, so the same object can have different weights on Earth and the Moon.",
        whenToUse:
          "Use this equation to calculate gravitational force when mass and local gravitational acceleration are known. Near Earth's surface, g is approximately 9.81 m/s².",
        variables: [
          { symbol: "W", meaning: "Weight", unit: "N", dimension: "MLT⁻²" },
          { symbol: "m", meaning: "Mass", unit: "kg", dimension: "M" },
          { symbol: "g", meaning: "Gravitational acceleration", unit: "m/s²", dimension: "LT⁻²" },
        ],
        dimensions: "MLT⁻²",
        siUnit: "N (newton)",
      },
      {
        id: "dyn-3",
        name: "Friction",
        formula: "f = μN",
        explanation:
          "For the usual model of dry friction, the magnitude of friction is related to the normal contact force by the coefficient of friction. This equation represents limiting static friction or kinetic friction, depending on the coefficient used.",
        physicalMeaning:
          "The normal force acts perpendicular to the contact surface. The coefficient of friction μ is dimensionless. In the kinetic-friction model, friction opposes relative sliding; static friction adjusts up to its maximum value.",
        whenToUse:
          "Use f = μN for kinetic friction or maximum static friction under the simple dry-friction model. Ordinary static friction is not always equal to μN; it can be smaller.",
        variables: [
          { symbol: "f", meaning: "Frictional force magnitude", unit: "N", dimension: "MLT⁻²" },
          {
            symbol: "μ",
            meaning: "Coefficient of friction",
            unit: "Dimensionless",
            dimension: "1",
          },
          { symbol: "N", meaning: "Normal contact force", unit: "N", dimension: "MLT⁻²" },
        ],
        dimensions: "MLT⁻²",
        siUnit: "N (newton)",
      },
      {
        id: "dyn-4",
        name: "Acceleration",
        formula: "a = F / m",
        explanation:
          "Rearranging Newton's second law gives acceleration as the net force divided by mass.",
        physicalMeaning:
          "Acceleration is directly proportional to net force and inversely proportional to mass. The direction of acceleration is the direction of the net force.",
        whenToUse:
          "Use this rearrangement when the net force and mass are known and acceleration is required. Ensure the force is the net force, not just one of the forces acting on the object.",
        variables: [
          { symbol: "a", meaning: "Acceleration", unit: "m/s²", dimension: "LT⁻²" },
          { symbol: "F", meaning: "Net force", unit: "N", dimension: "MLT⁻²" },
          { symbol: "m", meaning: "Mass", unit: "kg", dimension: "M" },
        ],
        dimensions: "LT⁻²",
        siUnit: "m/s²",
      },
    ],
  },

  {
    name: "MOMENTUM",
    description: "Linear momentum, impulse and collisions.",
    formulas: [
      {
        id: "mom-1",
        name: "Linear Momentum",
        formula: "p = mv",
        explanation:
          "Linear momentum is a vector quantity defined as the product of an object's mass and velocity. It describes the quantity of motion carried by an object and is important when analysing collisions, recoil and interactions between bodies.",
        physicalMeaning:
          "For the same velocity, a more massive object has greater momentum. For the same mass, a faster object has greater momentum. Momentum points in the same direction as velocity, and its value changes when the object's velocity or mass changes.",
        whenToUse:
          "Use this equation to calculate momentum when mass and velocity are known. Choose a consistent direction convention because momentum is a vector quantity.",
        variables: [
          {
            symbol: "p",
            meaning: "Linear momentum",
            unit: "kg·m/s",
            dimension: "MLT⁻¹",
          },
          {
            symbol: "m",
            meaning: "Mass of the object",
            unit: "kg",
            dimension: "M",
          },
          {
            symbol: "v",
            meaning: "Velocity of the object",
            unit: "m/s",
            dimension: "LT⁻¹",
          },
        ],
        dimensions: "MLT⁻¹",
        siUnit: "kg·m/s",
      },
      {
        id: "mom-2",
        name: "Impulse",
        formula: "J = Δp",
        explanation:
          "Impulse equals the change in momentum of an object. It measures the effect of a force acting over a time interval and is directly related to how much the object's momentum changes.",
        physicalMeaning:
          "A larger change in momentum produces a larger impulse. For the same momentum change, increasing the time over which the change occurs reduces the required average force. This principle is important in cushioning, airbags and sports impacts.",
        whenToUse:
          "Use this equation when the initial and final momenta are known, or when the change in momentum is required. The impulse and momentum change are vector quantities.",
        variables: [
          {
            symbol: "J",
            meaning: "Impulse",
            unit: "N·s",
            dimension: "MLT⁻¹",
          },
          {
            symbol: "Δp",
            meaning: "Change in momentum",
            unit: "kg·m/s",
            dimension: "MLT⁻¹",
          },
        ],
        dimensions: "MLT⁻¹",
        siUnit: "N·s (equivalent to kg·m/s)",
      },
      {
        id: "mom-3",
        name: "Impulse from Force",
        formula: "J = FΔt",
        explanation:
          "When a constant net force acts over a time interval, impulse is the product of the force and the duration for which it acts. For a varying force, impulse is determined by integrating force over time, or by using the average force.",
        physicalMeaning:
          "Impulse increases when the force increases or when the force acts for longer. For a given impulse, extending the impact duration reduces the average force, which explains the purpose of many protective systems.",
        whenToUse:
          "Use this equation for a constant net force or when F represents the average net force over the interval. It can be combined with J = Δp to find the resulting momentum change.",
        variables: [
          {
            symbol: "J",
            meaning: "Impulse",
            unit: "N·s",
            dimension: "MLT⁻¹",
          },
          {
            symbol: "F",
            meaning: "Constant or average net force",
            unit: "N",
            dimension: "MLT⁻²",
          },
          {
            symbol: "Δt",
            meaning: "Time interval",
            unit: "s",
            dimension: "T",
          },
        ],
        dimensions: "MLT⁻¹",
        siUnit: "N·s",
      },
      {
        id: "mom-4",
        name: "Conservation of Momentum",
        formula: "m₁u₁ + m₂u₂ = m₁v₁ + m₂v₂",
        explanation:
          "The conservation of momentum equation states that the total momentum before an interaction equals the total momentum after it, provided the system has zero net external impulse. It is commonly used to analyse collisions between two bodies.",
        physicalMeaning:
          "During a collision, objects can exchange momentum with each other, but the total momentum of an isolated system remains constant. Individual velocities may change substantially even though the total momentum is conserved.",
        whenToUse:
          "Use this equation for collisions or interactions when external impulse is negligible. Define a positive direction and use signed velocities so that opposite directions are represented correctly.",
        variables: [
          {
            symbol: "m₁",
            meaning: "Mass of object 1",
            unit: "kg",
            dimension: "M",
          },
          {
            symbol: "u₁",
            meaning: "Initial velocity of object 1",
            unit: "m/s",
            dimension: "LT⁻¹",
          },
          {
            symbol: "m₂",
            meaning: "Mass of object 2",
            unit: "kg",
            dimension: "M",
          },
          {
            symbol: "u₂",
            meaning: "Initial velocity of object 2",
            unit: "m/s",
            dimension: "LT⁻¹",
          },
          {
            symbol: "v₁",
            meaning: "Final velocity of object 1",
            unit: "m/s",
            dimension: "LT⁻¹",
          },
          {
            symbol: "v₂",
            meaning: "Final velocity of object 2",
            unit: "m/s",
            dimension: "LT⁻¹",
          },
        ],
        dimensions: "MLT⁻¹",
        siUnit: "kg·m/s",
      },
    ],
  },

  {
    name: "ENERGY & WORK",
    description: "Mechanical energy, work and power.",
    formulas: [
      {
        id: "energy-1",
        name: "Kinetic Energy",
        formula: "KE = ½mv²",
        explanation:
          "Kinetic energy is the energy an object possesses because of its motion. It depends on both mass and the square of speed, so increasing speed has a particularly strong effect on kinetic energy.",
        physicalMeaning:
          "For the same mass, doubling the speed makes kinetic energy four times greater. Kinetic energy is a scalar quantity, so it has magnitude but no direction. In classical mechanics, this equation applies at speeds much smaller than the speed of light.",
        whenToUse:
          "Use this equation to calculate the kinetic energy of a moving object when its mass and speed are known. Use the magnitude of velocity, not its direction.",
        variables: [
          { symbol: "KE", meaning: "Kinetic energy", unit: "J", dimension: "ML²T⁻²" },
          { symbol: "m", meaning: "Mass", unit: "kg", dimension: "M" },
          { symbol: "v", meaning: "Speed", unit: "m/s", dimension: "LT⁻¹" },
        ],
        dimensions: "ML²T⁻²",
        siUnit: "J (joule)",
      },
      {
        id: "energy-2",
        name: "Gravitational Potential Energy",
        formula: "PE = mgh",
        explanation:
          "Near Earth's surface, gravitational potential energy relative to a chosen reference level is the product of mass, gravitational acceleration and height above that level.",
        physicalMeaning:
          "An object at a greater height has more gravitational potential energy relative to the same reference level. The value depends on the chosen zero-height reference, while changes in potential energy between two heights are independent of that choice.",
        whenToUse:
          "Use this equation for height changes near Earth's surface, where gravitational acceleration can be treated as constant. Measure h relative to a clearly defined reference level.",
        variables: [
          {
            symbol: "PE",
            meaning: "Gravitational potential energy",
            unit: "J",
            dimension: "ML²T⁻²",
          },
          { symbol: "m", meaning: "Mass", unit: "kg", dimension: "M" },
          { symbol: "g", meaning: "Gravitational acceleration", unit: "m/s²", dimension: "LT⁻²" },
          { symbol: "h", meaning: "Height above reference level", unit: "m", dimension: "L" },
        ],
        dimensions: "ML²T⁻²",
        siUnit: "J (joule)",
      },
      {
        id: "energy-3",
        name: "Work",
        formula: "W = Fd",
        explanation:
          "Work is the energy transferred by a force when an object undergoes displacement. The formula W = Fd applies when a constant force acts in the same direction as the displacement.",
        physicalMeaning:
          "Only the component of force along the displacement contributes to work. In the general case of a constant force at angle θ to displacement, work is W = Fd cosθ. Work is positive when force supports the displacement and negative when it opposes it.",
        whenToUse:
          "Use W = Fd when force is constant and parallel to displacement. If force and displacement are at an angle, use W = Fd cosθ instead.",
        variables: [
          { symbol: "W", meaning: "Work done", unit: "J", dimension: "ML²T⁻²" },
          {
            symbol: "F",
            meaning: "Force component along displacement",
            unit: "N",
            dimension: "MLT⁻²",
          },
          { symbol: "d", meaning: "Displacement", unit: "m", dimension: "L" },
        ],
        dimensions: "ML²T⁻²",
        siUnit: "J (joule)",
      },
      {
        id: "energy-4",
        name: "Power",
        formula: "P = W / t",
        explanation:
          "Power is the rate at which work is done or energy is transferred. Average power is the total work divided by the time interval over which the work is performed.",
        physicalMeaning:
          "Two machines may perform the same amount of work but have different power ratings if one performs it in less time. Greater power means a higher rate of energy transfer, not necessarily a greater total amount of energy.",
        whenToUse:
          "Use this equation to calculate average power when work and elapsed time are known. For instantaneous power, the rate of energy transfer at a particular instant must be considered.",
        variables: [
          { symbol: "P", meaning: "Average power", unit: "W", dimension: "ML²T⁻³" },
          { symbol: "W", meaning: "Work done", unit: "J", dimension: "ML²T⁻²" },
          { symbol: "t", meaning: "Time interval", unit: "s", dimension: "T" },
        ],
        dimensions: "ML²T⁻³",
        siUnit: "W (watt)",
      },
    ],
  },

  {
    name: "PROJECTILE MOTION",
    description: "Motion of an object launched into the air under gravity.",
    formulas: [
      {
        id: "proj-1",
        name: "Horizontal Velocity",
        formula: "vₓ = v₀ cos θ",
        explanation:
          "The horizontal component of the initial velocity is obtained by multiplying the launch speed by the cosine of the launch angle. When air resistance is neglected, horizontal acceleration is zero, so this velocity remains constant throughout the flight.",
        physicalMeaning:
          "This component determines how quickly the projectile travels horizontally.",
        whenToUse:
          "Use it to calculate horizontal velocity, range, or horizontal displacement when the launch speed and angle are known.",
        variables: [
          { symbol: "vₓ", meaning: "Horizontal velocity", unit: "m/s", dimension: "LT⁻¹" },
          { symbol: "v₀", meaning: "Initial launch speed", unit: "m/s", dimension: "LT⁻¹" },
          {
            symbol: "θ",
            meaning: "Launch angle measured from the horizontal",
            unit: "rad",
            dimension: "1",
          },
        ],
        dimensions: "LT⁻¹",
        siUnit: "m/s",
      },
      {
        id: "proj-2",
        name: "Vertical Velocity",
        formula: "vᵧ = v₀ sin θ − gt",
        explanation:
          "The vertical velocity changes with time because gravity produces a constant downward acceleration. Taking upward as positive, the initial vertical velocity is v₀ sin θ and the velocity decreases by gt after time t.",
        physicalMeaning:
          "The sign of vertical velocity indicates direction: positive means upward, zero occurs at the highest point, and negative means downward.",
        whenToUse:
          "Use it to find vertical velocity at a particular time or determine when a projectile reaches its maximum height.",
        variables: [
          { symbol: "vᵧ", meaning: "Vertical velocity at time t", unit: "m/s", dimension: "LT⁻¹" },
          { symbol: "v₀", meaning: "Initial launch speed", unit: "m/s", dimension: "LT⁻¹" },
          { symbol: "θ", meaning: "Launch angle", unit: "rad", dimension: "1" },
          { symbol: "g", meaning: "Acceleration due to gravity", unit: "m/s²", dimension: "LT⁻²" },
          { symbol: "t", meaning: "Elapsed time", unit: "s", dimension: "T" },
        ],
        dimensions: "LT⁻¹",
        siUnit: "m/s",
      },
      {
        id: "proj-3",
        name: "Horizontal Position",
        formula: "x = v₀ cos θ · t",
        explanation:
          "With zero horizontal acceleration, horizontal displacement equals horizontal velocity multiplied by elapsed time. This expression assumes the projectile starts at x = 0.",
        physicalMeaning:
          "It describes how far the projectile travels horizontally after a given time.",
        whenToUse:
          "Use it to calculate horizontal displacement or locate the projectile horizontally at a known time.",
        variables: [
          {
            symbol: "x",
            meaning: "Horizontal displacement from launch point",
            unit: "m",
            dimension: "L",
          },
          { symbol: "v₀", meaning: "Initial launch speed", unit: "m/s", dimension: "LT⁻¹" },
          { symbol: "θ", meaning: "Launch angle", unit: "rad", dimension: "1" },
          { symbol: "t", meaning: "Elapsed time", unit: "s", dimension: "T" },
        ],
        dimensions: "L",
        siUnit: "m",
      },
      {
        id: "proj-4",
        name: "Vertical Position",
        formula: "y = v₀ sin θ · t − ½gt²",
        explanation:
          "Vertical displacement is the sum of the initial vertical motion and the displacement caused by gravitational acceleration. The equation takes the launch point as y = 0 and upward as the positive direction.",
        physicalMeaning:
          "It gives the projectile's height relative to its launch point at any elapsed time.",
        whenToUse:
          "Use it to calculate height at a given time, find the maximum height, or determine when the projectile returns to launch level.",
        variables: [
          {
            symbol: "y",
            meaning: "Vertical displacement from launch point",
            unit: "m",
            dimension: "L",
          },
          { symbol: "v₀", meaning: "Initial launch speed", unit: "m/s", dimension: "LT⁻¹" },
          { symbol: "θ", meaning: "Launch angle", unit: "rad", dimension: "1" },
          { symbol: "g", meaning: "Acceleration due to gravity", unit: "m/s²", dimension: "LT⁻²" },
          { symbol: "t", meaning: "Elapsed time", unit: "s", dimension: "T" },
        ],
        dimensions: "L",
        siUnit: "m",
      },
    ],
  },

  {
    name: "VECTORS",
    description: "Vector magnitudes, components, and direction.",
    formulas: [
      {
        id: "vec-1",
        name: "Velocity Magnitude",
        formula: "|v| = √(vₓ² + vᵧ²)",
        explanation:
          "The magnitude of a velocity vector is calculated using the Pythagorean theorem applied to its perpendicular horizontal and vertical components. It gives the overall speed of the object, independent of its direction.",
        physicalMeaning: "It combines motion along two perpendicular axes into one scalar speed.",
        whenToUse:
          "Use it when the horizontal and vertical velocity components are known and you need the resultant speed.",
        variables: [
          {
            symbol: "|v|",
            meaning: "Magnitude of velocity (speed)",
            unit: "m/s",
            dimension: "LT⁻¹",
          },
          {
            symbol: "vₓ",
            meaning: "Horizontal velocity component",
            unit: "m/s",
            dimension: "LT⁻¹",
          },
          { symbol: "vᵧ", meaning: "Vertical velocity component", unit: "m/s", dimension: "LT⁻¹" },
        ],
        dimensions: "LT⁻¹",
        siUnit: "m/s",
      },
      {
        id: "vec-2",
        name: "Acceleration Magnitude",
        formula: "|a| = √(aₓ² + aᵧ²)",
        explanation:
          "The acceleration magnitude is found by combining perpendicular acceleration components using the Pythagorean theorem. The result describes the overall rate of change of velocity.",
        physicalMeaning:
          "It represents the strength of acceleration regardless of the direction in which it acts.",
        whenToUse:
          "Use it when horizontal and vertical acceleration components are known and you need the resultant acceleration.",
        variables: [
          { symbol: "|a|", meaning: "Magnitude of acceleration", unit: "m/s²", dimension: "LT⁻²" },
          {
            symbol: "aₓ",
            meaning: "Horizontal acceleration component",
            unit: "m/s²",
            dimension: "LT⁻²",
          },
          {
            symbol: "aᵧ",
            meaning: "Vertical acceleration component",
            unit: "m/s²",
            dimension: "LT⁻²",
          },
        ],
        dimensions: "LT⁻²",
        siUnit: "m/s²",
      },
      {
        id: "vec-3",
        name: "Vector Direction",
        formula: "θ = tan⁻¹(vᵧ / vₓ)",
        explanation:
          "The direction angle of a velocity vector can be calculated from the ratio of its vertical and horizontal components. The inverse tangent gives an angle relative to the positive horizontal axis. In code, atan2(vᵧ, vₓ) is generally preferable because it correctly accounts for the signs of both components and identifies the appropriate quadrant.",
        physicalMeaning:
          "It describes the direction in which the object is moving, rather than how fast it is moving.",
        whenToUse:
          "Use it when velocity components are known and you need the direction of motion. If vₓ = 0, handle the vertical direction separately or use atan2.",
        variables: [
          { symbol: "θ", meaning: "Direction angle", unit: "rad", dimension: "1" },
          { symbol: "vᵧ", meaning: "Vertical velocity component", unit: "m/s", dimension: "LT⁻¹" },
          {
            symbol: "vₓ",
            meaning: "Horizontal velocity component",
            unit: "m/s",
            dimension: "LT⁻¹",
          },
        ],
        dimensions: "1 (dimensionless angle)",
        siUnit: "rad",
      },
    ],
  },

  {
    name: "CIRCULAR MOTION",
    description:
      "Angular and tangential quantities, centripetal acceleration, period and frequency.",
    formulas: [
      {
        id: "circ-1",
        name: "Angular Displacement",
        formula: "θ = s / r",
        explanation:
          "Angular displacement θ is the angle through which a point has rotated about a fixed axis. It equals the arc length s divided by the radius r of the circular path. The result is in radians, which are dimensionless ratios of length.",
        physicalMeaning:
          "One radian is the angle subtended at the centre of a circle when the arc length equals the radius. For a full revolution, θ = 2π rad (≈ 6.28 rad). Angular displacement accumulates over time as the object continues to rotate.",
        whenToUse:
          "Use θ = s/r to convert between arc length and angle when the radius is known, or to calculate how far along the arc a particle has travelled given its angular position.",
        variables: [
          { symbol: "θ", meaning: "Angular displacement", unit: "rad", dimension: "1" },
          { symbol: "s", meaning: "Arc length", unit: "m", dimension: "L" },
          { symbol: "r", meaning: "Radius of circular path", unit: "m", dimension: "L" },
        ],
        dimensions: "1 (dimensionless)",
        siUnit: "rad",
      },
      {
        id: "circ-2",
        name: "Angular Velocity",
        formula: "ω = Δθ / Δt",
        explanation:
          "Angular velocity ω is the rate of change of angular displacement with respect to time. For uniform circular motion, ω = v / r, where v is the constant tangential speed and r is the radius.",
        physicalMeaning:
          "Angular velocity describes how fast an object is rotating. A larger ω means more revolutions per second. The sign of ω indicates direction: positive for counterclockwise and negative for clockwise by convention.",
        whenToUse:
          "Use ω = Δθ/Δt for the average angular velocity over a time interval. Use ω = v/r when tangential speed and radius are given. For uniform circular motion these two forms give identical results.",
        variables: [
          { symbol: "ω", meaning: "Angular velocity", unit: "rad/s", dimension: "T⁻¹" },
          { symbol: "Δθ", meaning: "Change in angular displacement", unit: "rad", dimension: "1" },
          { symbol: "Δt", meaning: "Time interval", unit: "s", dimension: "T" },
          { symbol: "v", meaning: "Tangential speed", unit: "m/s", dimension: "LT⁻¹" },
          { symbol: "r", meaning: "Radius", unit: "m", dimension: "L" },
        ],
        dimensions: "T⁻¹",
        siUnit: "rad/s",
      },
      {
        id: "circ-3",
        name: "Tangential Velocity",
        formula: "v = rω",
        explanation:
          "The tangential velocity of a point on a rotating body is the product of the radius and the angular velocity. It is directed perpendicular to the radius at every instant.",
        physicalMeaning:
          "Even at constant angular velocity, every point on a rotating object has a fixed tangential speed that depends on its distance from the axis. Points farther from the axis move faster.",
        whenToUse:
          "Use v = rω to find the linear speed of any point in a rotating system when its distance from the axis and the angular velocity are known.",
        variables: [
          { symbol: "v", meaning: "Tangential speed", unit: "m/s", dimension: "LT⁻¹" },
          { symbol: "r", meaning: "Radius", unit: "m", dimension: "L" },
          { symbol: "ω", meaning: "Angular velocity", unit: "rad/s", dimension: "T⁻¹" },
        ],
        dimensions: "LT⁻¹",
        siUnit: "m/s",
      },
      {
        id: "circ-4",
        name: "Centripetal Acceleration",
        formula: "aₒ = v² / r = rω²",
        explanation:
          "Centripetal acceleration is directed toward the centre of the circular path at every instant. It is not a change in speed but a change in direction of velocity. For uniform circular motion, its magnitude is v²/r or equivalently rω².",
        physicalMeaning:
          "Without centripetal acceleration, an object would travel in a straight line. The centripetal acceleration continuously redirects the velocity vector, keeping the particle on its circular path. Greater speed or a smaller radius requires larger centripetal acceleration.",
        whenToUse:
          "Use aₒ = v²/r when tangential speed and radius are known. Use aₒ = rω² when angular velocity and radius are known. The two are equivalent for uniform circular motion.",
        variables: [
          { symbol: "aₒ", meaning: "Centripetal acceleration", unit: "m/s²", dimension: "LT⁻²" },
          { symbol: "v", meaning: "Tangential speed", unit: "m/s", dimension: "LT⁻¹" },
          { symbol: "r", meaning: "Radius", unit: "m", dimension: "L" },
          { symbol: "ω", meaning: "Angular velocity", unit: "rad/s", dimension: "T⁻¹" },
        ],
        dimensions: "LT⁻²",
        siUnit: "m/s²",
      },
      {
        id: "circ-5",
        name: "Centripetal Force",
        formula: "Fc = mv² / r = mrω²",
        explanation:
          "Centripetal force is the net inward force required to maintain circular motion. It is provided by physical forces such as tension, friction, gravity or a normal reaction — not a separate type of force.",
        physicalMeaning:
          "The centripetal force is always directed toward the centre of the circular path. Removing it causes the object to leave the circle and travel in a straight line tangent to its path at the moment of release.",
        whenToUse:
          "Use Fc = mv²/r or Fc = mrω² to calculate the net inward force needed for circular motion. Identify what real force (or component of a force) is providing this centripetal requirement in a given problem.",
        variables: [
          { symbol: "Fc", meaning: "Centripetal force", unit: "N", dimension: "MLT⁻²" },
          { symbol: "m", meaning: "Mass", unit: "kg", dimension: "M" },
          { symbol: "v", meaning: "Tangential speed", unit: "m/s", dimension: "LT⁻¹" },
          { symbol: "r", meaning: "Radius", unit: "m", dimension: "L" },
          { symbol: "ω", meaning: "Angular velocity", unit: "rad/s", dimension: "T⁻¹" },
        ],
        dimensions: "MLT⁻²",
        siUnit: "N (newton)",
      },
      {
        id: "circ-6",
        name: "Period and Frequency",
        formula: "T = 2π / ω     f = 1 / T",
        explanation:
          "The period T is the time taken for one complete revolution. The frequency f is the number of complete revolutions per second. They are reciprocals of each other. Both can be expressed in terms of angular velocity ω.",
        physicalMeaning:
          "Period and frequency are complementary descriptions of the same rotation rate. A short period means rapid rotation and high frequency. The angular velocity ω = 2πf = 2π/T links all three quantities.",
        whenToUse:
          "Use T = 2π/ω when angular velocity is known and you need the time for one complete revolution. Use f = 1/T to convert between period and frequency. Use ω = 2πf when frequency is given.",
        variables: [
          { symbol: "T", meaning: "Period", unit: "s", dimension: "T" },
          { symbol: "f", meaning: "Frequency", unit: "Hz", dimension: "T⁻¹" },
          { symbol: "ω", meaning: "Angular velocity", unit: "rad/s", dimension: "T⁻¹" },
        ],
        dimensions: "T / T⁻¹",
        siUnit: "s / Hz",
      },
      {
        id: "circ-7",
        name: "Angular Acceleration",
        formula: "α = Δω / Δt",
        explanation:
          "Angular acceleration α is the rate of change of angular velocity with time. It arises in non-uniform circular motion where the speed along the circular path is changing. For constant angular acceleration, the kinematic equations ω = ω₀ + αt and θ = θ₀ + ω₀t + ½αt² apply.",
        physicalMeaning:
          "Angular acceleration indicates how quickly the rotation rate is speeding up or slowing down. When α is positive and ω is positive, the body spins faster. When they have opposite signs, the rotation slows.",
        whenToUse:
          "Use α = Δω/Δt when you need the average angular acceleration over a time interval. Use the kinematic equations for constant-angular-acceleration problems, analogous to the linear kinematic equations.",
        variables: [
          { symbol: "α", meaning: "Angular acceleration", unit: "rad/s²", dimension: "T⁻²" },
          { symbol: "Δω", meaning: "Change in angular velocity", unit: "rad/s", dimension: "T⁻¹" },
          { symbol: "Δt", meaning: "Time interval", unit: "s", dimension: "T" },
        ],
        dimensions: "T⁻²",
        siUnit: "rad/s²",
      },
    ],
  },

  {
    name: "ROTATIONAL DYNAMICS",
    description:
      "Torque, moment of inertia, angular momentum, rotational energy and Newton's second law for rotation.",
    formulas: [
      {
        id: "rot-1",
        name: "Torque",
        formula: "τ = rF sin θ",
        explanation:
          "Torque τ is the rotational equivalent of force. It depends on the magnitude of the applied force F, the distance r from the axis of rotation to the point of application, and the sine of the angle θ between the position vector and the force vector.",
        physicalMeaning:
          "Only the component of force perpendicular to the lever arm contributes to torque. When θ = 90°, the full force contributes; when θ = 0° or 180°, the torque is zero. Torque is the cause of angular acceleration.",
        whenToUse:
          "Use τ = rF sin θ whenever a force is applied at a distance from an axis. When the force is applied perpendicular to the lever arm, sin θ = 1 and τ = rF. This is the most common situation in simple problems.",
        variables: [
          { symbol: "τ", meaning: "Torque", unit: "N·m", dimension: "ML²T⁻²" },
          { symbol: "r", meaning: "Distance from axis to point of application", unit: "m", dimension: "L" },
          { symbol: "F", meaning: "Applied force magnitude", unit: "N", dimension: "MLT⁻²" },
          { symbol: "θ", meaning: "Angle between r and F", unit: "rad", dimension: "1" },
        ],
        dimensions: "ML²T⁻²",
        siUnit: "N·m (newton-metre)",
      },
      {
        id: "rot-2",
        name: "Newton's Second Law for Rotation",
        formula: "τ_net = Iα",
        explanation:
          "The net torque acting on a rigid body equals the product of its moment of inertia and its angular acceleration. This is the rotational analogue of F = ma for linear motion.",
        physicalMeaning:
          "A greater net torque produces a greater angular acceleration. For a fixed torque, a body with a larger moment of inertia accelerates more slowly. The moment of inertia plays the role of mass in rotational dynamics.",
        whenToUse:
          "Use τ_net = Iα to find angular acceleration when net torque and moment of inertia are known, or to find the torque required for a desired angular acceleration. This applies to fixed-axis rotation with constant I.",
        variables: [
          { symbol: "τ_net", meaning: "Net torque", unit: "N·m", dimension: "ML²T⁻²" },
          { symbol: "I", meaning: "Moment of inertia", unit: "kg·m²", dimension: "ML²" },
          { symbol: "α", meaning: "Angular acceleration", unit: "rad/s²", dimension: "T⁻²" },
        ],
        dimensions: "ML²T⁻²",
        siUnit: "N·m",
      },
      {
        id: "rot-3",
        name: "Moment of Inertia",
        formula: "I = Σ mᵢrᵢ²",
        explanation:
          "The moment of inertia is the rotational analogue of mass. It is a measure of how difficult it is to angularly accelerate a body about a given axis. For standard shapes, closed-form expressions exist: I = ½MR² for a solid disc, I = MR² for a thin ring, and so on.",
        physicalMeaning:
          "Mass closer to the rotation axis contributes less to the moment of inertia than mass farther away (because of the r² factor). This is why a figure skater pulls their arms in to spin faster — they reduce their moment of inertia, and conservation of angular momentum increases their spin rate.",
        whenToUse:
          "Use the standard formulae for uniform solid shapes. For compound objects, add the moments of inertia of the individual parts. Use the parallel-axis theorem I = I_cm + Md² when the axis does not pass through the centre of mass.",
        variables: [
          { symbol: "I", meaning: "Moment of inertia", unit: "kg·m²", dimension: "ML²" },
          { symbol: "M", meaning: "Total mass of body", unit: "kg", dimension: "M" },
          { symbol: "R", meaning: "Characteristic radius", unit: "m", dimension: "L" },
          { symbol: "r", meaning: "Distance of mass element from axis", unit: "m", dimension: "L" },
        ],
        dimensions: "ML²",
        siUnit: "kg·m²",
      },
      {
        id: "rot-4",
        name: "Angular Momentum",
        formula: "L = Iω",
        explanation:
          "Angular momentum L is the rotational analogue of linear momentum. For a rigid body rotating about a fixed axis, it equals the product of the moment of inertia and the angular velocity. It is conserved when the net external torque is zero.",
        physicalMeaning:
          "Conservation of angular momentum explains why spinning tops maintain their orientation, why a diver tucks to rotate faster, and how planets orbiting the sun obey Kepler's second law.",
        whenToUse:
          "Use L = Iω to calculate angular momentum. Use the conservation law L_i = L_f when the net external torque on a system is zero over a time interval — especially useful for analysing interactions between rotating bodies.",
        variables: [
          { symbol: "L", meaning: "Angular momentum", unit: "kg·m²/s", dimension: "ML²T⁻¹" },
          { symbol: "I", meaning: "Moment of inertia", unit: "kg·m²", dimension: "ML²" },
          { symbol: "ω", meaning: "Angular velocity", unit: "rad/s", dimension: "T⁻¹" },
        ],
        dimensions: "ML²T⁻¹",
        siUnit: "kg·m²/s",
      },
      {
        id: "rot-5",
        name: "Rotational Kinetic Energy",
        formula: "KE_rot = ½Iω²",
        explanation:
          "A rotating rigid body has kinetic energy by virtue of its rotation. The rotational kinetic energy is analogous to the translational kinetic energy ½mv², with I replacing m and ω replacing v.",
        physicalMeaning:
          "For a body that both translates and rotates (such as a rolling wheel), the total kinetic energy is the sum of translational and rotational kinetic energies: KE = ½mv² + ½Iω². The rolling constraint then links v and ω.",
        whenToUse:
          "Use KE_rot = ½Iω² for bodies rotating about a fixed axis. For rolling-without-slipping problems, combine with the translational kinetic energy. Use energy methods when force and acceleration are hard to find directly.",
        variables: [
          { symbol: "KE_rot", meaning: "Rotational kinetic energy", unit: "J", dimension: "ML²T⁻²" },
          { symbol: "I", meaning: "Moment of inertia", unit: "kg·m²", dimension: "ML²" },
          { symbol: "ω", meaning: "Angular velocity", unit: "rad/s", dimension: "T⁻¹" },
        ],
        dimensions: "ML²T⁻²",
        siUnit: "J (joule)",
      },
      {
        id: "rot-6",
        name: "Work Done by Torque",
        formula: "W = τθ",
        explanation:
          "When a constant torque τ acts through an angular displacement θ, the work done is their product. This is the rotational analogue of W = Fd for a constant linear force.",
        physicalMeaning:
          "Only the component of torque aligned with the rotation axis does work. The work-energy theorem for rotation states that the net work done by all torques equals the change in rotational kinetic energy: W = ΔKE_rot.",
        whenToUse:
          "Use W = τθ for a constant torque. For a variable torque, integrate torque over the angular displacement. Combine with the work-energy theorem to solve problems where forces and accelerations are not needed explicitly.",
        variables: [
          { symbol: "W", meaning: "Work done by torque", unit: "J", dimension: "ML²T⁻²" },
          { symbol: "τ", meaning: "Constant net torque", unit: "N·m", dimension: "ML²T⁻²" },
          { symbol: "θ", meaning: "Angular displacement", unit: "rad", dimension: "1" },
        ],
        dimensions: "ML²T⁻²",
        siUnit: "J (joule)",
      },
      {
        id: "rot-7",
        name: "Rotational Power",
        formula: "P = τω",
        explanation:
          "Rotational power is the rate at which a torque does work. For a constant torque and constant angular velocity, the instantaneous power is the product of torque and angular velocity.",
        physicalMeaning:
          "Rotational power is the rotational equivalent of P = Fv for translational power. An engine delivering a fixed power can produce a large torque at low speed or a small torque at high speed.",
        whenToUse:
          "Use P = τω to find the mechanical power delivered by a rotating shaft. This is especially useful in engineering applications involving motors, turbines and gearboxes.",
        variables: [
          { symbol: "P", meaning: "Rotational power", unit: "W", dimension: "ML²T⁻³" },
          { symbol: "τ", meaning: "Torque", unit: "N·m", dimension: "ML²T⁻²" },
          { symbol: "ω", meaning: "Angular velocity", unit: "rad/s", dimension: "T⁻¹" },
        ],
        dimensions: "ML²T⁻³",
        siUnit: "W (watt)",
      },
    ],
  },
];

function FormulaLibraryPage() {
  const [selectedId, setSelectedId] = useState("kin-1");
  const [searchQuery, setSearchQuery] = useState("");

  const allFormulas = FORMULA_CATEGORIES.flatMap((category) => category.formulas);
  const filteredCategories = FORMULA_CATEGORIES.map((category) => ({
    ...category,
    formulas: category.formulas.filter(
      (formula) =>
        formula.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        formula.formula.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  })).filter((category) => category.formulas.length > 0);

  const selected = allFormulas.find((formula) => formula.id === selectedId) ?? allFormulas[0]!;

  return (
    <main className="mx-auto flex w-full max-w-[1700px] flex-1 flex-col gap-3 p-3 sm:p-4">
      <div className="grid min-h-0 flex-1 gap-3 xl:h-[calc(100dvh-6rem)] xl:flex-none xl:grid-cols-[280px_minmax(0,1fr)]">
        {/* LEFT — CATEGORY LIBRARY */}
        <Panel title="FORMULA LIBRARY" subtitle={`${allFormulas.length} reference equations`}>
          <div className="mb-3">
            <div className="relative">
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search formula or topic..."
                className="tech h-9 w-full rounded-md border border-border bg-background/60 px-3 text-[11px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="scroll-thin max-h-[calc(100dvh-13rem)] space-y-1 overflow-y-auto pr-1">
            {filteredCategories.map((category) => {
              const isSelectedCategory = category.formulas.some(
                (formula) => formula.id === selectedId,
              );

              return (
                <div
                  key={category.name}
                  className="overflow-hidden rounded-md border border-border bg-background/40"
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!isSelectedCategory) {
                        setSelectedId(category.formulas[0]!.id);
                      }
                    }}
                    className={cn(
                      "w-full px-3 py-2 text-left transition-all",
                      isSelectedCategory ? "bg-primary/10" : "hover:bg-accent",
                    )}
                  >
                    <div className="label-micro">{category.name}</div>
                    <div className="mt-1 text-[10px] leading-snug text-muted-foreground">
                      {category.description}
                    </div>
                  </button>

                  <div className="space-y-1 border-t border-border/70 p-1.5">
                    {category.formulas.map((formula) => (
                      <button
                        key={formula.id}
                        type="button"
                        onClick={() => setSelectedId(formula.id)}
                        className={cn(
                          "w-full rounded px-2.5 py-2 text-left text-[10px] transition-colors",
                          selectedId === formula.id
                            ? "border border-primary/40 bg-primary/10 text-primary"
                            : "border border-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
                        )}
                      >
                        <div className="font-medium">{formula.name}</div>
                        <div className="mt-1 font-mono text-[10px]">{formula.formula}</div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* CENTER — FORMULAS */}
        <Panel title={selected.name} subtitle="FORMULA EXPLANATION">
          <div className="scroll-thin max-h-[calc(100dvh-13rem)] space-y-5 overflow-y-auto pr-1">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="label-micro mb-2">FORMULA</div>
              <div className="font-mono text-xl tracking-wide text-primary">{selected.formula}</div>
            </div>

            <div>
              <div className="label-micro mb-2">WHAT DOES THIS FORMULA REPRESENT?</div>
              <p className="text-[12px] leading-6 text-muted-foreground">{selected.explanation}</p>
            </div>

            <div>
              <div className="label-micro mb-2">PHYSICAL MEANING</div>
              <p className="text-[12px] leading-6 text-muted-foreground">
                {selected.physicalMeaning}
              </p>
            </div>

            <div>
              <div className="label-micro mb-2">WHEN TO USE</div>
              <div className="rounded-md border border-border bg-background/40 px-3 py-3 text-[11px] leading-5 text-foreground">
                {selected.whenToUse}
              </div>
            </div>

            <div>
              <div className="label-micro mb-2">Variables</div>
              <div className="overflow-x-auto rounded-md border border-border">
                <div className="grid min-w-[420px] grid-cols-[76px_1fr_70px_70px] border-b border-border bg-background/60 px-3 py-2">
                  <span className="label-micro">Symbol</span>
                  <span className="label-micro">Meaning</span>
                  <span className="label-micro">Unit</span>
                  <span className="label-micro">Dim.</span>
                </div>

                {selected.variables.map((variable) => (
                  <div
                    key={variable.symbol}
                    className="grid min-w-[420px] grid-cols-[76px_1fr_70px_70px] items-center border-b border-border/60 px-3 py-2.5 last:border-b-0"
                  >
                    <span className="font-mono text-[12px] text-primary">{variable.symbol}</span>
                    <span className="pr-2 text-[10px] leading-snug text-muted-foreground">
                      {variable.meaning}
                    </span>
                    <span className="font-mono text-[10px] text-foreground">{variable.unit}</span>
                    <span className="font-mono text-[10px] text-primary">{variable.dimension}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="label-micro mb-2">DIMENSION</div>
              <div className="rounded-md border border-border bg-background/40 px-3 py-3 font-mono text-sm text-primary">
                [{selected.dimensions}]
              </div>
            </div>

            <div>
              <div className="label-micro mb-2">SI UNIT</div>
              <div className="rounded-md border border-border bg-background/40 px-3 py-3 font-mono text-sm text-primary">
                {selected.siUnit}
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </main>
  );
}
