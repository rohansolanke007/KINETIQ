export const fmt = (value: number, digits = 2) =>
  Number.isFinite(value) ? value.toFixed(digits) : "—";

export const speedOf = (v: { x: number; y: number }) => Math.hypot(v.x, v.y);

export const shapeColor = (shape: string) => {
  switch (shape) {
    case "Circle":
      return "var(--cyan)";
    case "Rectangle":
      return "var(--blue)";
    case "Triangle":
      return "var(--purple)";
    default:
      return "var(--green)";
  }
};
