/**
 * Small static diagrams for the Explore cards. They are schematic drawings,
 * not simulation output.
 */
const P = "var(--primary)";
const C = "var(--cyan)";
const M = "var(--muted-foreground)";
const A = "var(--amber)";

function Arrow({
  x1,
  y1,
  x2,
  y2,
  color,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const hx = (d: number) => x2 - 7 * Math.cos(a + d);
  const hy = (d: number) => y2 - 7 * Math.sin(a + d);
  return (
    <g stroke={color} strokeWidth="1.8" fill={color} strokeLinecap="round">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <polygon
        points={`${x2},${y2} ${hx(0.45)},${hy(0.45)} ${hx(-0.45)},${hy(-0.45)}`}
        stroke="none"
      />
    </g>
  );
}

export function ConceptIllustration({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 200 104" className="h-full w-full" role="img" aria-hidden fill="none">
      <line x1="14" y1="86" x2="186" y2="86" stroke={M} strokeOpacity=".5" strokeWidth="1.2" />
      {id === "mechanics" && (
        <g>
          <rect
            x="76"
            y="56"
            width="44"
            height="30"
            rx="3"
            fill={P}
            fillOpacity=".22"
            stroke={P}
            strokeWidth="1.8"
          />
          <Arrow x1={122} y1={71} x2={170} y2={71} color={C} />
          <Arrow x1={74} y1={80} x2={44} y2={80} color={A} />
          <Arrow x1={98} y1={56} x2={98} y2={26} color={M} />
        </g>
      )}
      {id === "projectile" && (
        <g>
          <path d="M22 86 Q 100 -8 178 86" stroke={C} strokeWidth="1.8" strokeDasharray="5 4" />
          <circle cx="22" cy="86" r="5" fill={P} />
          <circle cx="100" cy="38" r="5" fill={P} fillOpacity=".45" stroke={P} strokeWidth="1.5" />
          <Arrow x1={22} y1={86} x2={52} y2={58} color={A} />
          <path d="M42 86 A 20 20 0 0 0 38 76" stroke={M} strokeWidth="1.2" />
        </g>
      )}
      {id === "oscillations" && (
        <g>
          <line x1="20" y1="30" x2="20" y2="80" stroke={M} strokeWidth="2" />
          <polyline
            points="20,55 34,55 40,42 52,68 64,42 76,68 88,42 100,68 108,55 124,55"
            stroke={C}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <rect
            x="124"
            y="40"
            width="30"
            height="30"
            rx="3"
            fill={P}
            fillOpacity=".22"
            stroke={P}
            strokeWidth="1.8"
          />
          <path
            d="M20 22 C 50 4, 80 40, 110 22 S 170 4, 186 18"
            stroke={M}
            strokeOpacity=".55"
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />
        </g>
      )}
      {id === "circular" && (
        <g>
          <circle
            cx="100"
            cy="52"
            r="32"
            stroke={M}
            strokeOpacity=".6"
            strokeWidth="1.2"
            strokeDasharray="3 4"
          />
          <line x1="100" y1="52" x2="132" y2="52" stroke={P} strokeWidth="1.8" />
          <circle cx="132" cy="52" r="6" fill={P} />
          <Arrow x1={132} y1={52} x2={132} y2={20} color={C} />
          <Arrow x1={132} y1={52} x2={108} y2={52} color={A} />
          <circle cx="100" cy="52" r="2" fill={M} />
        </g>
      )}
      {id === "energy-momentum" && (
        <g>
          <circle cx="62" cy="62" r="16" fill={P} fillOpacity=".22" stroke={P} strokeWidth="1.8" />
          <circle cx="142" cy="66" r="12" fill={C} fillOpacity=".22" stroke={C} strokeWidth="1.8" />
          <Arrow x1={18} y1={62} x2={42} y2={62} color={A} />
          <Arrow x1={186} y1={66} x2={166} y2={66} color={A} />
          <rect x="84" y="18" width="8" height="22" fill={P} fillOpacity=".5" />
          <rect x="98" y="26" width="8" height="14" fill={C} fillOpacity=".5" />
          <rect x="112" y="12" width="8" height="28" fill={M} fillOpacity=".45" />
        </g>
      )}
    </svg>
  );
}
