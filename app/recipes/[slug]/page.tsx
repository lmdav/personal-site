import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Arrow } from "@/components/arrow-icon";
import { CheckRow, CookModeRoot, CookModeStatus, CookModeToggle } from "@/components/cook-mode";
import { IngredientsSheet } from "@/components/ingredients-sheet";
import { PrintButton } from "@/components/print-button";
import { RecipeVersions, VersionPicker } from "@/components/recipe-versions";
import { AnnouncementBar, SiteNav } from "@/components/site-chrome";
import { recipeJsonLd, serializeJsonLd } from "@/lib/recipe-jsonld";
import {
  formatMinutes,
  mainRecipes,
  versionKey,
  versionsOf,
  type Recipe,
  type RecipeImage,
  type RecipeVideo,
} from "@/lib/recipes";
import { SITE_URL } from "@/lib/site";
import { RecipesFooter } from "../recipes-footer";

type Props = { params: Promise<{ slug: string }> };

// Only recipes that exist at build time get a page; anything else is a 404. A recipe
// that is another one's version (variantOf) is a choice on that page instead, and its
// old address redirects there (next.config.ts).
export const dynamicParams = false;

export function generateStaticParams() {
  return mainRecipes().map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [recipe] = versionsOf((await params).slug);
  if (!recipe) return {};
  const url = `/recipes/${recipe.slug}`;
  const images = recipe.image ? [{ url: recipe.image.src, alt: recipe.image.alt }] : undefined;
  return {
    title: `${recipe.title} - Liam Davis`,
    description: recipe.summary,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: recipe.title,
      description: recipe.summary,
      publishedTime: recipe.date,
      images,
    },
    twitter: {
      card: recipe.image ? "summary_large_image" : "summary",
      title: recipe.title,
      description: recipe.summary,
      images,
    },
  };
}

export default async function RecipePage({ params }: Props) {
  const versions = versionsOf((await params).slug);
  const recipe = versions[0];
  if (!recipe) notFound();
  const jsonLd = recipeJsonLd(recipe, `${SITE_URL}/recipes/${recipe.slug}`);

  return (
    <CookModeRoot className="recipe-page min-h-screen w-full overflow-x-clip bg-black text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <AnnouncementBar />
      <SiteNav current="recipes" />

      <article className="recipe-article mx-auto w-full max-w-[1800px] px-6 pb-24 pt-6 md:px-16 md:pb-32 md:pt-10">
        {versions.length > 1 ? (
          <RecipeVersions
            keys={versions.map(versionKey)}
            labels={versions.map((v) => v.variant ?? v.title)}
            panels={versions.map((v) => <RecipeContent key={v.slug} recipe={v} />)}
          />
        ) : (
          <RecipeContent recipe={recipe} />
        )}
      </article>

      <RecipesFooter />
    </CookModeRoot>
  );
}

/** One version of the recipe, from the title to the chef's notes. */
function RecipeContent({ recipe }: { recipe: Recipe }) {
  return (
    <>
      <RecipeHeader recipe={recipe} />

      <div className="recipe-body mt-8 grid grid-cols-1 gap-12 border-t border-white/12 pt-8 md:mt-10 md:grid-cols-12 md:gap-10 md:pt-10">
        <Ingredients recipe={recipe} />
        <Steps recipe={recipe} />
      </div>

      {recipe.video && <HowToVideo video={recipe.video} title={recipe.title} />}
      {recipe.image && <RecipePhoto image={recipe.image} />}
      <Tags tags={recipe.tags} />

      <div className="recipe-extras mt-20 grid grid-cols-1 gap-14 border-t border-white/12 pt-14 md:grid-cols-12 md:gap-10">
        {recipe.tips.length > 0 && <Tips recipe={recipe} />}
        <NutritionFacts recipe={recipe} />
        {recipe.notes.length > 0 && <ChefNotes recipe={recipe} />}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Header - title, summary, version choice, meta row                   */
/* ------------------------------------------------------------------ */

function RecipeHeader({ recipe }: { recipe: Recipe }) {
  const meta = [
    { label: "Serves", value: String(recipe.servings) },
    { label: "Prep", value: formatMinutes(recipe.prepMinutes) },
    { label: "Cook", value: formatMinutes(recipe.cookMinutes) },
    { label: "Total", value: formatMinutes(recipe.totalMinutes) },
    { label: "Protein", value: `${recipe.nutrition.protein} g per serving` },
  ];

  return (
    <header>
      <div className="print-hidden flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Link
          href="/recipes"
          className="label inline-flex min-h-11 items-center gap-2 text-white/70 transition-colors hover:text-white"
        >
          <Arrow className="h-3 w-3 rotate-180" />
          ALL RECIPES
        </Link>
        <div className="flex gap-2">
          <CookModeToggle />
          <PrintButton />
        </div>
      </div>
      <CookModeStatus className="mt-3 text-[16px] text-white/80" />

      <h1 className="recipe-title display-serif mt-5 text-[clamp(2.5rem,6vw,5rem)] leading-[1] text-white">
        {recipe.title}
      </h1>
      <p className="recipe-summary mt-4 max-w-[46rem] font-serif text-[clamp(1.125rem,1.6vw,1.375rem)] leading-[1.3] text-white/75">
        {recipe.summary}
      </p>
      <VersionPicker className="mt-6" />

      <dl className="recipe-meta mt-6 flex flex-wrap gap-x-7 gap-y-2">
        {meta.map((m) => (
          <div key={m.label} className="flex items-baseline gap-2">
            <dt className="text-[14px] uppercase tracking-[0.06em] text-white/60">{m.label}</dt>
            <dd className="text-[17px] text-white">{m.value}</dd>
          </div>
        ))}
      </dl>
      {recipe.servingsNote && (
        <p className="recipe-serving-note mt-2 text-[15px] text-white/60">{recipe.servingsNote}</p>
      )}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Photo and tags - after the steps, so the recipe comes first        */
/* ------------------------------------------------------------------ */

function RecipePhoto({ image }: { image: RecipeImage }) {
  return (
    <figure className="recipe-photo print-hidden mt-16 max-w-[56rem] border-t border-white/12 pt-10">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-white/5 sm:aspect-[16/9]">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="(min-width: 960px) 896px, 100vw"
          className="object-cover"
        />
      </div>
      {image.credit && (
        <figcaption className="mt-3 text-[13px] text-white/60">
          {image.creditUrl ? (
            <a
              href={image.creditUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-white/30 underline-offset-4 transition-colors hover:text-white"
            >
              {image.credit}
            </a>
          ) : (
            image.credit
          )}
        </figcaption>
      )}
    </figure>
  );
}

function Tags({ tags }: { tags: string[] }) {
  return (
    <ul role="list" className="print-hidden mt-8 flex flex-wrap gap-2" aria-label="Tags">
      {tags.map((tag, i) => (
        <li key={`${i}-${tag}`} className="border border-white/20 px-2 py-1.5 text-[13px] uppercase tracking-[0.06em] text-white/70">
          {tag.replace(/-/g, " ")}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* How-to video (screen only)                                          */
/* ------------------------------------------------------------------ */

function HowToVideo({ video, title }: { video: RecipeVideo; title: string }) {
  return (
    <section aria-labelledby="how-to" className="print-hidden mt-16 md:mt-20">
      <h2 id="how-to" className="section-tag text-white/60">
        WATCH THE HOW-TO
      </h2>
      <video
        controls
        playsInline
        preload="none"
        poster={video.poster}
        aria-label={`${title}: narrated step-by-step how-to video, with captions`}
        className="mt-6 aspect-video w-full bg-white/5"
      >
        <source src={video.src} type="video/mp4" />
      </video>
      {video.credits.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm text-white/45">
          {video.credits.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Ingredients and steps                                               */
/* ------------------------------------------------------------------ */

function Ingredients({ recipe }: { recipe: Recipe }) {
  // On a computer the list stays in view while the steps scroll; it scrolls
  // on its own when it is taller than the screen.
  return (
    <section
      aria-labelledby="ingredients"
      data-lenis-prevent-wheel
      className="recipe-ingredients md:sticky md:top-24 md:col-span-4 md:max-h-[calc(100dvh-7rem)] md:self-start md:overflow-y-auto md:pr-4"
    >
      <h2 id="ingredients" className="section-tag text-white/60">
        INGREDIENTS
      </h2>
      <IngredientGroups recipe={recipe} />
    </section>
  );
}

function IngredientGroups({ recipe }: { recipe: Recipe }) {
  return recipe.ingredients.map((group, i) => (
    <div key={i} className="recipe-group mt-6">
      {group.name && (
        <h3 className="text-[14px] uppercase tracking-[0.08em] text-[var(--color-acid)]">
          {group.name}
        </h3>
      )}
      <ul role="list" className="mt-2">
        {group.items.map((item, j) => (
          <CheckRow
            key={`${j}-${item}`}
            id={`${recipe.slug}:ingredient-${i}-${j}`}
            label={item}
            className="recipe-ingredient flex gap-3 py-1 text-[17px] leading-[1.45] text-white/85"
            markerClassName="flex shrink-0 items-start"
            marker={<span aria-hidden className="ingredient-dash cook-hide mt-[0.72em] h-px w-3 bg-white/40" />}
          >
            <span>{item}</span>
          </CheckRow>
        ))}
      </ul>
    </div>
  ));
}

function Steps({ recipe }: { recipe: Recipe }) {
  const stepMinutes = recipe.steps.reduce((sum, step) => sum + (step.minutes ?? 0), 0);

  return (
    <section aria-labelledby="steps" className="recipe-steps md:col-span-8">
      <h2 id="steps" className="section-tag text-white/60">
        STEPS
      </h2>
      {stepMinutes > recipe.totalMinutes && (
        <p className="recipe-overlap mt-3 max-w-[38rem] text-[15px] leading-[1.5] text-white/60">
          Some steps happen at the same time, so the step times add up to more than the{" "}
          {formatMinutes(recipe.totalMinutes)} total.
        </p>
      )}
      <ol role="list" className="mt-6">
        {recipe.steps.map((step, i) => (
          <CheckRow
            key={`${i}-${step.title}`}
            id={`${recipe.slug}:step-${i}`}
            label={`Step ${i + 1}: ${step.title}`}
            className="recipe-step grid grid-cols-[2.75rem_1fr] gap-4 border-t border-white/12 py-6 first:border-t-0 first:pt-0 md:grid-cols-[4rem_1fr]"
            markerClassName="flex flex-col items-start gap-2"
            marker={
              <span aria-hidden className="display-serif text-[30px] text-white/50">
                {String(i + 1).padStart(2, "0")}
              </span>
            }
          >
            <div>
              <h3 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[19px] font-medium text-white">
                {step.title}
                {step.minutes !== undefined && (
                  <span className="text-[14px] font-normal text-white/60">{formatMinutes(step.minutes)}</span>
                )}
              </h3>
              <p className="recipe-step-text mt-2 max-w-[34rem] text-[18px] leading-[1.55] text-white/85">
                {step.text}
              </p>
            </div>
          </CheckRow>
        ))}
      </ol>
      <IngredientsSheet>
        <IngredientGroups recipe={recipe} />
      </IngredientsSheet>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Tips, nutrition, chef's notes                                       */
/* ------------------------------------------------------------------ */

function Tips({ recipe }: { recipe: Recipe }) {
  return (
    <section aria-labelledby="tips" className="recipe-tips md:col-span-5">
      <h2 id="tips" className="section-tag text-white/60">
        TIPS
      </h2>
      <ul role="list" className="mt-8 space-y-5">
        {recipe.tips.map((tip, i) => (
          <li key={`${i}-${tip.text}`} className="text-[17px] leading-[1.55] text-white/80">
            {tip.title && <strong className="font-medium text-white">{tip.title}: </strong>}
            {tip.text}
          </li>
        ))}
      </ul>
    </section>
  );
}

function NutritionFacts({ recipe }: { recipe: Recipe }) {
  const n = recipe.nutrition;
  const rows = [
    { label: "Calories", value: `${n.calories} kcal` },
    { label: "Protein", value: `${n.protein} g` },
    { label: "Carbohydrate", value: `${n.carbs} g` },
    { label: "Fat", value: `${n.fat} g` },
    { label: "Fiber", value: `${n.fiber} g` },
  ];

  return (
    <section aria-labelledby="nutrition" className="recipe-nutrition md:col-span-3">
      <h2 id="nutrition" className="section-tag text-white/60">
        NUTRITION
      </h2>
      <p className="mt-8 text-[14px] uppercase tracking-[0.06em] text-white/60">Per serving, estimated</p>
      <dl className="mt-4">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between border-b border-white/12 py-2.5 text-[16px]"
          >
            <dt className="text-white/70">{row.label}</dt>
            <dd className="text-white">{row.value}</dd>
          </div>
        ))}
      </dl>
      {n.note && <p className="mt-4 text-[14px] leading-[1.5] text-white/60">{n.note}</p>}
    </section>
  );
}

function ChefNotes({ recipe }: { recipe: Recipe }) {
  return (
    <section aria-labelledby="notes" className="recipe-notes print-hidden md:col-span-4">
      <h2 id="notes" className="section-tag text-white/60">
        CHEF&apos;S NOTES
      </h2>
      <div className="mt-8 space-y-4">
        {recipe.notes.map((paragraph, i) => (
          <p key={i} className="font-serif text-[19px] leading-[1.4] text-white/75">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
