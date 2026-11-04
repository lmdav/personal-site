// Where slices land in the skillet template's saute. Pure, so the scene check (scenes.ts)
// can tell when a pan is too full to place them all.
import { rng } from "../geo.ts";

export type SkilletPiece = "mushroom" | "onion" | "broccoli";

/** How each kind of slice sits in the pan: the gap it keeps from others (and from its own
 * kind, if wider), and its raw color and how much of it stays. */
export const SLICES: Record<SkilletPiece, { gap: number; ownGap?: number; raw: string; keep: number }> = {
  mushroom: { gap: 0.026, ownGap: 0.034, raw: "#C4AE8E", keep: 0.7 },
  onion: { gap: 0.022, raw: "#EEE7D8", keep: 0.2 },
  broccoli: { gap: 0.04, raw: "#6FA24A", keep: 0.6 },
};

/** The slices in one layer, not touching. A slice that finds no room after 400 tries is
 * left out, so the scene check compares the count placed with the count asked for. */
export function panLayout(food: { piece: SkilletPiece; count: number }[]) {
  const r = rng(33);
  const placed: { x: number; z: number; piece: SkilletPiece; variant: number; yaw: number; drift: number }[] = [];
  const tryPlace = (piece: SkilletPiece) => {
    const { gap, ownGap } = SLICES[piece];
    for (let k = 0; k < 400; k++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * 0.083;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      if (placed.every((p) => Math.hypot(p.x - x, p.z - z) > (p.piece === piece && ownGap ? ownGap : gap))) {
        placed.push({ x, z, piece, variant: placed.length, yaw: r() * 6.3, drift: r() * 6.3 });
        return;
      }
    }
  };
  for (const { piece, count } of food) for (let i = 0; i < count; i++) tryPlace(piece);
  return placed;
}
