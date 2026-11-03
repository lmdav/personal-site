// The recipe's blueprint sheet, drawn from the same parts as the video.
// Laid out at 1600 x 1100 and rendered at 2x (3200 x 2200) for the website.
import { AbsoluteFill } from "remotion";
import { BuiltBowl } from "./Video";
import { Beans, Callout, Cheese, Defs, Mushroom, OnionDice, Parchment, Patty, Pickle, Potato, Romaine, Tomato } from "./parts";
import { ACCENT, HAND, INK, INK2, MONO, PAPER, SERIF } from "./theme";

const W = 1600;
const H = 1100;

const PARTS: [string, string, string][] = [
  ["1", "Bowl, wide", "1"],
  ["2", "Romaine, chopped", "2 cups"],
  ["3", "Tomato, diced", "1 small"],
  ["4", "Onion, diced, raw", "1/4"],
  ["5", "Dill pickle chips", "1/4 cup"],
  ["6", "Crispy potatoes", "8 oz"],
  ["7", "Smash patty, 90% lean", "2 (6 oz)"],
  ["8", "American cheese", "1 slice, halved"],
  ["9", "Mushrooms and onions", "1 cup"],
  ["10", "Special sauce", "1 batch"],
  ["11", "Smoky pinto beans", "1/2 cup"],
];

const SCHEDULE: [string, [number, number, boolean][]][] = [
  ["Potatoes", [[0, 6, true], [6, 11, false], [11, 26, true]]],
  ["Sauce", [[1, 3, true], [3, 27, false]]],
  ["Beans", [[6, 12, true], [12, 28, false]]],
  ["Mushrooms", [[12, 18, true]]],
  ["Cold side", [[18, 20, true]]],
  ["Burgers", [[21, 24, false], [24, 27, true]]],
  ["Build", [[27, 28, true]]],
];

const NOTES = [
  "1. Pan smoking hot for the patties.",
  "2. Parchment on top, press once.",
  "3. Hands off 2 min for the crust.",
  "4. Dry potatoes crisp. Wet ones steam.",
  "5. Salt lightly. The toppings are salty.",
  "6. Ground beef is done at 160°F.",
];

function Label({ x, y, children, size = 14, color = INK, anchor = "start", weight = 400 }: { x: number; y: number; children: string; size?: number; color?: string; anchor?: "start" | "middle" | "end"; weight?: number }) {
  return (
    <text x={x} y={y} fontFamily={MONO} fontSize={size} fill={color} textAnchor={anchor} fontWeight={weight}>
      {children}
    </text>
  );
}

function Heading({ x, y, children, width }: { x: number; y: number; children: string; width: number }) {
  return (
    <g>
      <Label x={x} y={y} size={16} weight={500}>
        {children}
      </Label>
      <path d={`M${x} ${y + 8}H${x + width}`} stroke={INK} strokeWidth="1" />
    </g>
  );
}

export function BlueprintSheet() {
  const k = (760 - 250) / 30;
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
        <Defs />
        <rect width={W} height={H} fill="url(#paper-grid)" />
        <rect x="20" y="20" width={W - 40} height={H - 40} fill="none" stroke={INK} strokeWidth="1.8" />
        <rect x="50" y="50" width={W - 100} height={H - 100} fill="none" stroke={INK} strokeWidth="1" />
        {Array.from({ length: 8 }, (_, i) => (
          <g key={i}>
            {i > 0 && <path d={`M${50 + (i * (W - 100)) / 8} 20V50M${50 + (i * (W - 100)) / 8} ${H - 50}V${H - 20}`} stroke={INK} strokeWidth="1" />}
            <Label x={50 + ((i + 0.5) * (W - 100)) / 8} y={40} size={12} color={INK2} anchor="middle">{String(i + 1)}</Label>
            <Label x={50 + ((i + 0.5) * (W - 100)) / 8} y={H - 30} size={12} color={INK2} anchor="middle">{String(i + 1)}</Label>
          </g>
        ))}
        {"ABCDE".split("").map((L, i) => (
          <g key={L}>
            {i > 0 && <path d={`M20 ${50 + (i * (H - 100)) / 5}H50M${W - 50} ${50 + (i * (H - 100)) / 5}H${W - 20}`} stroke={INK} strokeWidth="1" />}
            <Label x={35} y={50 + ((i + 0.5) * (H - 100)) / 5 + 4} size={12} color={INK2} anchor="middle">{L}</Label>
            <Label x={W - 35} y={50 + ((i + 0.5) * (H - 100)) / 5 + 4} size={12} color={INK2} anchor="middle">{L}</Label>
          </g>
        ))}

        {/* View 1: the finished bowl, numbered */}
        <Label x={300} y={150} size={15} weight={500} anchor="middle">Cold side, crisp</Label>
        <Label x={570} y={150} size={15} weight={500} anchor="middle">Hot side, 160°F</Label>
        <BuiltBowl x={430} y={380} R={330} />
        <Beans x={700} y={650} r={70} />
        <Callout x={90} y={250} tx={290} ty={386} n={2} text="" />
        <Callout x={90} y={330} tx={276} ty={330} n={3} text="" />
        <Callout x={90} y={410} tx={256} ty={376} n={4} text="" />
        <Callout x={90} y={490} tx={304} ty={305} n={5} text="" />
        <Callout x={430} y={170} tx={430} ty={362} n={10} text="" />
        <Callout x={790} y={220} tx={522} ty={300} n={7} text="" />
        <Callout x={790} y={300} tx={520} ty={386} n={8} text="" />
        <Callout x={790} y={380} tx={604} ty={360} n={6} text="" />
        <Callout x={790} y={460} tx={632} ty={300} n={9} text="" />
        <Callout x={160} y={660} tx={260} ty={610} n={1} text="" />
        <Callout x={790} y={600} tx={735} ty={620} n={11} text="" />
        <Heading x={110} y={760} width={360}>View 1. The bowl, ready to eat.</Heading>

        {/* How to smash */}
        <Heading x={860} y={110} width={260}>How to smash a patty</Heading>
        <Patty x={930} y={300} r={120} smash={0} crust={0} seed={51} />
        <Label x={930} y={370} size={13} anchor="middle">1. Cold ball, 3 oz</Label>
        <path d="M1010 270 H1060" stroke={INK} strokeWidth="1.6" markerEnd="url(#note-arrow)" />
        <Patty x={1170} y={300} r={95} smash={0.55} crust={0.2} seed={52} />
        <Parchment x={1170} y={262} s={78} opacity={0.95} />
        <path d="M1170 160 V215" stroke={ACCENT} strokeWidth="2" markerEnd="url(#note-arrow)" />
        <Label x={1170} y={370} size={13} anchor="middle">2. Parchment, press hard</Label>
        <path d="M1275 270 H1320" stroke={INK} strokeWidth="1.6" markerEnd="url(#note-arrow)" />
        <Patty x={1430} y={300} r={100} smash={1} crust={1} seed={53} />
        <Cheese x={1430} y={300} r={100} melt={1} lift={12} seed={54} />
        <Label x={1430} y={370} size={13} anchor="middle">3. 2 min hands off, flip</Label>
        <text x="1300" y="420" fontFamily={HAND} fontSize="26" fill={ACCENT} transform="rotate(-3 1300 420)">lacy edges = crunch</text>

        {/* Parts list and small parts */}
        <Label x={860} y={478} size={16} weight={500}>Parts list</Label>
        <rect x="860" y="490" width="360" height={22 * (PARTS.length + 1)} fill={PAPER} stroke={INK} strokeWidth="1.4" />
        {[["Item", "Part", "Qty"] as [string, string, string], ...PARTS].map((row, i) => (
          <g key={i}>
            {i > 0 && <path d={`M860 ${490 + i * 22}H1220`} stroke={INK2} strokeWidth={i === 1 ? 1.2 : 0.6} />}
            <Label x={868} y={506 + i * 22} size={12.5} color={i ? INK : INK2}>{row[0]}</Label>
            <Label x={914} y={506 + i * 22} size={12.5} color={i ? INK : INK2}>{row[1]}</Label>
            <Label x={1100} y={506 + i * 22} size={12.5} color={i ? INK : INK2}>{row[2]}</Label>
          </g>
        ))}
        <path d={`M906 490V${490 + 22 * (PARTS.length + 1)}M1092 490V${490 + 22 * (PARTS.length + 1)}`} stroke={INK2} strokeWidth="0.6" />
        <Potato x={1290} y={560} r={50} seed={61} />
        <Label x={1290} y={600} size={12} color={INK2} anchor="middle">6</Label>
        <Mushroom x={1400} y={570} s={40} />
        <Label x={1400} y={600} size={12} color={INK2} anchor="middle">9</Label>
        <Pickle x={1490} y={560} r={30} seed={62} />
        <Label x={1490} y={600} size={12} color={INK2} anchor="middle">5</Label>
        <Tomato x={1275} y={690} s={18} />
        <OnionDice x={1315} y={695} s={9} />
        <Label x={1295} y={725} size={12} color={INK2} anchor="middle">3, 4</Label>
        <Romaine x={1400} y={685} L={44} W={19} rot={0.3} seed={63} />
        <Label x={1400} y={725} size={12} color={INK2} anchor="middle">2</Label>
        <Beans x={1490} y={705} r={42} />
        <Label x={1490} y={738} size={12} color={INK2} anchor="middle">11</Label>

        {/* Schedule */}
        <Heading x={110} y={815} width={480}>Schedule, minutes. Solid is hands on.</Heading>
        {SCHEDULE.map(([label, segs], i) => (
          <g key={label}>
            <Label x={110} y={853 + i * 21} size={12.5}>{label}</Label>
            {segs.map(([a, b, active], j) =>
              active ? (
                <rect key={j} x={250 + a * k} y={843 + i * 21} width={(b - a) * k} height="12" fill={INK} />
              ) : (
                <rect key={j} x={250 + a * k} y={843 + i * 21} width={(b - a) * k} height="12" fill="none" stroke={INK2} strokeDasharray="4 3" />
              ),
            )}
          </g>
        ))}
        <path d="M250 1000H760" stroke={INK} strokeWidth="1" />
        {[0, 5, 10, 15, 20, 25, 30].map((m) => (
          <g key={m}>
            <path d={`M${250 + m * k} 1000V1005`} stroke={INK} />
            <Label x={250 + m * k} y={1022} size={12} color={INK2} anchor="middle">{String(m)}</Label>
          </g>
        ))}

        {/* Notes */}
        <Heading x={860} y={815} width={260}>Notes</Heading>
        {NOTES.map((line, i) => (
          <Label key={line} x={860} y={850 + i * 26} size={12.5}>{line}</Label>
        ))}

        {/* Title block */}
        <rect x="1190" y="780" width="340" height="250" fill={PAPER} stroke={INK} strokeWidth="1.6" />
        <path d="M1190 860H1530M1190 902H1530M1190 944H1530M1190 986H1530M1365 860V986" stroke={INK} strokeWidth="0.9" />
        <Label x={1204} y={804} size={12} color={INK2}>LIAM&apos;S KITCHEN, RECIPE DRAWING</Label>
        <text x="1204" y="846" fontFamily={SERIF} fontSize="36" fill={INK}>Smash Burger Bowl</text>
        <Label x={1204} y={886} size={13}>Dwg no. SBB-01</Label>
        <Label x={1379} y={886} size={13}>Rev C</Label>
        <Label x={1204} y={928} size={13}>Serves 1</Label>
        <Label x={1379} y={928} size={13}>30 min total</Label>
        <Label x={1204} y={970} size={13}>Drawn L. Davis</Label>
        <Label x={1379} y={970} size={13}>2026-11-02</Label>
        <Label x={1204} y={1013} size={13}>~900 kcal, 57 g protein, 15 g fiber</Label>
      </svg>
    </AbsoluteFill>
  );
}
