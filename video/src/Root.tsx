import { Fragment } from "react";
import { Composition, Still } from "remotion";
import { PartsSheet } from "./PartsSheet";
import { BlueprintSheet } from "./Sheet";
import { PROOF_FRAMES, ProductShot } from "./proof/ProductShot";
import { BOWL3D_FRAMES, Bowl3D } from "./proof/Bowl3D";
import { BOWL_REAL_FRAMES, BowlReal } from "./proof/BowlReal";
import { PosterShot } from "./howto/bowlScenes";
import { HowTo } from "./howto/HowTo";
import { RECIPES } from "./howto/recipes";
import { FPS } from "./howto/scenes";

// The v4 how-to videos (docs/recipes-media-v4.md), one pair for every recipe with a scene
// file and narration: wide for the recipe page, with the recipe's slug as its id, vertical
// for phones, and the poster still (the finished bowl, no title or caption).
export function RemotionRoot() {
  return (
    <>
      {RECIPES.map(({ slug, frames }) => (
        <Fragment key={slug}>
          <Composition id={slug} component={HowTo} durationInFrames={frames} fps={FPS} width={1920} height={1080} defaultProps={{ slug, draft: false, tall: false }} />
          <Composition id={`${slug}-vertical`} component={HowTo} durationInFrames={frames} fps={FPS} width={1080} height={1920} defaultProps={{ slug, draft: false, tall: true }} />
          <Still id={`${slug}-poster`} component={PosterShot} width={1920} height={1080} defaultProps={{ slug }} />
        </Fragment>
      ))}
      <Still id="smash-burger-bowl-blueprint" component={BlueprintSheet} width={3200} height={2200} />
      <Composition id="proof-product-shot" component={ProductShot} durationInFrames={PROOF_FRAMES} fps={30} width={1920} height={1080} />
      <Composition id="proof-bowl-3d" component={Bowl3D} durationInFrames={BOWL3D_FRAMES} fps={30} width={1920} height={1080} />
      <Composition id="proof-bowl-real" component={BowlReal} durationInFrames={BOWL_REAL_FRAMES} fps={30} width={1920} height={1080} />
      <Still id="parts-sheet" component={PartsSheet} width={1920} height={1080} />
    </>
  );
}
