import { Composition, Still } from "remotion";
import narration from "./data/smash-burger-bowl.narration.json";
import recipe from "./data/smash-burger-bowl.json";
import lines from "./recipes/smash-burger-bowl.narration.json";
import { PartsSheet } from "./PartsSheet";
import { BlueprintSheet } from "./Sheet";
import { HowToVideo, SCENES, totalFrames, type Scene, type VideoProps } from "./Video";

// One composition per recipe; its id matches the recipe slug.
const durations = narration.durations as Record<Scene, number>;
const captions = Object.fromEntries(SCENES.map((s) => [s, lines[s].caption])) as Record<Scene, string>;
const smashBurgerBowl: VideoProps = {
  slug: "smash-burger-bowl",
  title: recipe.title,
  facts: [`Serves ${recipe.servings}`, `${recipe.totalMinutes} min`, `${recipe.nutrition.protein} g protein`],
  captions,
  durations,
};

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="smash-burger-bowl"
        component={HowToVideo}
        durationInFrames={totalFrames(durations)}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={smashBurgerBowl}
      />
      <Still id="smash-burger-bowl-blueprint" component={BlueprintSheet} width={3200} height={2200} />
      <Still id="parts-sheet" component={PartsSheet} width={1920} height={1080} />
    </>
  );
}
