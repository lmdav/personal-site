import { Composition } from "remotion";
import { HowTo, totalFrames } from "./HowTo";
import recipe from "./data/smash-burger-bowl.json";
import { cues, stepCrops, tour } from "./recipes/smash-burger-bowl";
import type { HowToProps } from "./types";

// One composition per recipe. Its id matches the recipe slug.
export function RemotionRoot() {
  const props: HowToProps = {
    recipe,
    cues,
    stepCrops,
    tour,
    blueprint: "smash-burger-bowl/blueprint.png",
  };
  return (
    <Composition
      id="smash-burger-bowl"
      component={HowTo}
      durationInFrames={totalFrames(recipe.steps.length)}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={props}
    />
  );
}
