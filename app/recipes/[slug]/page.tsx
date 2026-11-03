import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Arrow } from "@/components/arrow-icon";
import { PrintButton } from "@/components/print-button";
import { AnnouncementBar, SiteNav } from "@/components/site-chrome";
import { recipeJsonLd, serializeJsonLd } from "@/lib/recipe-jsonld";
import {
  formatMinutes,
  getRecipe,
  loadRecipes,
  type Recipe,
  type RecipeDrawing,
  type RecipeImage,
  type RecipeVideo,
} from "@/lib/recipes";
import { SITE_URL } from "@/lib/site";
import { RecipesFooter } from "../recipes-footer";

type Props = { params: Promise<{ slug: string }> };

// Only recipes that exist at build time get a page; anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return loadRecipes().map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const recipe = getRecipe((await params).slug);
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
  const recipe = getRecipe((await params).slug);
  if (!recipe) notFound();
  const jsonLd = recipeJsonLd(recipe, `${SITE_URL}/recipes/${recipe.slug}`);

  return (
    <main className="recipe-page min-h-screen w-full overflow-x-clip bg-black text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <AnnouncementBar />
      <SiteNav current="recipes" />

      <article className="recipe-article mx-auto w-full max-w-[1800px] px-6 pb-24 pt-10 md:px-16 md:pb-32 md:pt-16">
        <RecipeHeader recipe={recipe} />
        {recipe.image && <RecipePhoto image={recipe.image} />}
        {recipe.video && <HowToVideo video={recipe.video} title={recipe.title} />}

        <div className="recipe-body mt-14 grid grid-cols-1 gap-14 border-t border-white/12 pt-14 md:grid-cols-12 md:gap-10">
          <Ingredients recipe={recipe} />
          <Steps recipe={recipe} />
        </div>

        {recipe.blueprint && <Blueprint drawing={recipe.blueprint} />}

        <div className="recipe-extras mt-20 grid grid-cols-1 gap-14 border-t border-white/12 pt-14 md:grid-cols-12 md:gap-10">
          {recipe.tips.length > 0 && <Tips recipe={recipe} />}
          <NutritionFacts recipe={recipe} />
          {recipe.notes.length > 0 && <ChefNotes recipe={recipe} />}
        </div>
      </article>

      <RecipesFooter />
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Header - title, summary, meta row                                   */
/* ------------------------------------------------------------------ */

function RecipeHeader({ recipe }: { recipe: Recipe }) {
  const meta = [
    { label: "SERVES", value: String(recipe.servings), note: recipe.servingsNote },
    { label: "PREP", value: formatMinutes(recipe.prepMinutes) },
    { label: "COOK", value: formatMinutes(recipe.cookMinutes) },
    { label: "TOTAL", value: formatMinutes(recipe.totalMinutes) },
    { label: "PROTEIN", value: `${recipe.nutrition.protein} g`, note: "Per serving" },
  ];

  return (
    <header>
      <div className="print-hidden flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/recipes"
          className="label inline-flex items-center gap-2 text-white/70 transition-colors hover:text-white"
        >
          <Arrow className="h-3 w-3 rotate-180" />
          ALL RECIPES
        </Link>
        <PrintButton />
      </div>

      <ul role="list" className="print-hidden mt-12 flex flex-wrap gap-2 md:mt-16" aria-label="Tags">
        {recipe.tags.map((tag, i) => (
          <li key={`${i}-${tag}`} className="label-sm border border-white/20 px-2 py-1.5 text-white/70">
            {tag.replace(/-/g, " ")}
          </li>
        ))}
      </ul>

      <h1 className="recipe-title display-serif mt-6 text-[clamp(2.75rem,8vw,7rem)] leading-[1] text-white">
        {recipe.title}
      </h1>
      <p className="recipe-summary mt-6 max-w-[780px] font-serif text-[clamp(1.25rem,2vw,1.6rem)] leading-[1.3] text-white/75">
        {recipe.summary}
      </p>

      <dl className="recipe-meta mt-10 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 md:grid-cols-5">
        {meta.map((m) => (
          <div key={m.label}>
            <dt className="label-sm text-white/60">{m.label}</dt>
            <dd className="mt-3 font-serif text-[26px] leading-none text-white">{m.value}</dd>
            {m.note && <dd className="mt-2 text-[14px] text-white/60">{m.note}</dd>}
          </div>
        ))}
      </dl>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Photo - wide, with a credit line for photos that are not Liam's     */
/* ------------------------------------------------------------------ */

function RecipePhoto({ image }: { image: RecipeImage }) {
  return (
    <figure className="recipe-photo mt-12 md:mt-16">
      <div className="recipe-photo-frame relative aspect-[4/3] w-full overflow-hidden bg-white/5 sm:aspect-[16/9] lg:aspect-[21/9]">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          priority
          sizes="(min-width: 1800px) 1672px, 100vw"
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

/* ------------------------------------------------------------------ */
/* How-to video and blueprint drawing (screen only)                    */
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
        aria-label={`${title}: step-by-step how-to video, with no sound`}
        className="mt-6 aspect-video w-full bg-white/5"
      >
        <source src={video.src} type="video/mp4" />
      </video>
    </section>
  );
}

function Blueprint({ drawing }: { drawing: RecipeDrawing }) {
  return (
    <section aria-labelledby="blueprint" className="print-hidden mt-20 border-t border-white/12 pt-14">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 id="blueprint" className="section-tag text-white/60">
          THE BLUEPRINT
        </h2>
        <a
          href={drawing.src}
          target="_blank"
          rel="noopener noreferrer"
          className="label inline-flex items-center gap-2 text-white/70 transition-colors hover:text-white"
        >
          OPEN FULL SIZE
          <Arrow className="h-3 w-3" />
        </a>
      </div>
      <a href={drawing.src} target="_blank" rel="noopener noreferrer" className="mt-6 block">
        <Image
          src={drawing.src}
          alt={drawing.alt}
          width={3200}
          height={2200}
          sizes="(min-width: 1800px) 1672px, 100vw"
          className="h-auto w-full"
        />
      </a>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Ingredients and steps                                               */
/* ------------------------------------------------------------------ */

function Ingredients({ recipe }: { recipe: Recipe }) {
  return (
    <section aria-labelledby="ingredients" className="recipe-ingredients md:col-span-4">
      <h2 id="ingredients" className="section-tag text-white/60">
        INGREDIENTS
      </h2>
      {recipe.ingredients.map((group, i) => (
        <div key={i} className="recipe-group mt-8">
          {group.name && (
            <h3 className="label text-[var(--color-acid)]">{group.name}</h3>
          )}
          <ul role="list" className="mt-4 space-y-3">
            {group.items.map((item, j) => (
              <li key={`${j}-${item}`} className="flex gap-3 text-[17px] leading-[1.5] text-white/85">
                <span aria-hidden className="mt-[0.75em] h-px w-3 shrink-0 bg-white/40" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function Steps({ recipe }: { recipe: Recipe }) {
  return (
    <section aria-labelledby="steps" className="recipe-steps md:col-span-8">
      <h2 id="steps" className="section-tag text-white/60">
        STEPS
      </h2>
      <ol role="list" className="mt-8">
        {recipe.steps.map((step, i) => (
          <li
            key={`${i}-${step.title}`}
            className="recipe-step grid grid-cols-[2.75rem_1fr] gap-4 border-t border-white/12 py-7 first:border-t-0 first:pt-0 md:grid-cols-[4rem_1fr]"
          >
            <span aria-hidden className="display-serif text-[32px] text-white/50">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <h3 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[19px] font-medium text-white">
                {step.title}
                {step.minutes !== undefined && (
                  <span className="label-sm text-white/60">{formatMinutes(step.minutes)}</span>
                )}
              </h3>
              <p className="mt-3 max-w-[68ch] text-[17px] leading-[1.6] text-white/80">
                {step.text}
              </p>
            </div>
          </li>
        ))}
      </ol>
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
      <p className="mt-8 label-sm text-white/60">PER SERVING, ESTIMATED</p>
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
