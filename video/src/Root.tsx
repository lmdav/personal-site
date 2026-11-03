import { Composition, Still } from "remotion";
import { PartsSheet } from "./PartsSheet";
import { BlueprintSheet } from "./Sheet";
import { PROOF_FRAMES, ProductShot } from "./proof/ProductShot";
import { BOWL3D_FRAMES, Bowl3D } from "./proof/Bowl3D";
import { BOWL_REAL_FRAMES, BowlReal } from "./proof/BowlReal";
import { HOWTO_FRAMES, HowTo } from "./howto/HowTo";

// The v4 how-to video (docs/recipes-media-v4.md), wide for the recipe page and vertical
// for phones. The wide one takes over the slug's id when it is wired into the recipe
// page; until then the page keeps its v3 video.
export function RemotionRoot() {
  return (
    <>
      <Composition id="smash-burger-bowl-v4" component={HowTo} durationInFrames={HOWTO_FRAMES} fps={30} width={1920} height={1080} defaultProps={{ draft: false, tall: false }} />
      <Composition id="smash-burger-bowl-v4-vertical" component={HowTo} durationInFrames={HOWTO_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ draft: false, tall: true }} />
      <Still id="smash-burger-bowl-blueprint" component={BlueprintSheet} width={3200} height={2200} />
      <Composition id="proof-product-shot" component={ProductShot} durationInFrames={PROOF_FRAMES} fps={30} width={1920} height={1080} />
      <Composition id="proof-bowl-3d" component={Bowl3D} durationInFrames={BOWL3D_FRAMES} fps={30} width={1920} height={1080} />
      <Composition id="proof-bowl-real" component={BowlReal} durationInFrames={BOWL_REAL_FRAMES} fps={30} width={1920} height={1080} />
      <Still id="parts-sheet" component={PartsSheet} width={1920} height={1080} />
    </>
  );
}
