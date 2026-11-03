import { AbsoluteFill } from "remotion";
import { BowlBack, BowlFront, Beans, Callout, Cheese, Cup, Defs, Drizzle, Lid, Mushroom, OnionDice, OnionSliver, Parchment, Patty, Pickle, Potato, Romaine, SauceCup, Skillet, Spatula, Tomato } from "./parts";
import { MONO, PAPER } from "./theme";

/** Every part in its key states, for checking the drawings. Not shown on the site. */
export function PartsSheet() {
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <svg viewBox="0 0 1920 1080" width="100%" height="100%">
        <Defs />
        <rect width="1920" height="1080" fill="url(#paper-grid)" />
        <Patty x={150} y={200} smash={0} crust={0} />
        <Patty x={400} y={210} r={110} smash={0.5} crust={0.2} />
        <Patty x={720} y={220} r={130} smash={1} crust={1} />
        <Cheese x={720} y={220} r={130} melt={1} lift={12} />
        <Potato x={150} y={420} flatten={0} crisp={0} />
        <Potato x={360} y={430} r={80} flatten={1} crisp={0.2} />
        <Potato x={560} y={430} r={80} flatten={1} crisp={1} seed={8} />
        <Mushroom x={760} y={450} s={55} />
        <Mushroom x={880} y={450} s={55} brown={1} tilt={0.3} />
        <OnionSliver x={1000} y={430} rot={0.3} />
        <Romaine x={1100} y={420} rot={0.4} />
        <Tomato x={1200} y={430} />
        <OnionDice x={1250} y={430} />
        <Pickle x={1320} y={430} />
        <Beans x={1480} y={450} bubbles={1} phase={0.3} />
        <SauceCup x={1700} y={450} />
        <Skillet x={330} y={800} heat={1} phase={0.2} />
        <Patty x={330} y={780} r={100} smash={1} crust={0.6} seed={12} />
        <Parchment x={330} y={760} s={90} opacity={0.9} />
        <Spatula x={330} y={740} lift={10} />
        <Cup x={800} y={820} />
        <Lid x={1050} y={830} steam={1} phase={0.4} />
        <BowlBack x={1500} y={760} R={280} depth={130} />
        <Romaine x={1400} y={780} rot={0.2} />
        <Potato x={1580} y={790} r={60} />
        <BowlFront x={1500} y={760} R={280} />
        <Drizzle points={[[1300, 720], [1380, 700], [1460, 740], [1540, 710], [1620, 750], [1700, 720]]} progress={0.8} />
        <Callout x={980} y={120} tx={790} ty={190} n={7} text="Smash patty, 3 oz" />
        <text x="40" y="1050" fontFamily={MONO} fontSize="18" fill="#6E819B">PARTS CHECK SHEET, NOT PUBLISHED</text>
      </svg>
    </AbsoluteFill>
  );
}
