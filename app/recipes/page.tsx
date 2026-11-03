import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Arrow } from "@/components/arrow-icon";
import { AnnouncementBar, SiteNav } from "@/components/site-chrome";
import { formatDate, formatMinutes, loadRecipes, type Recipe } from "@/lib/recipes";
import { RecipesFooter } from "./recipes-footer";

const DESCRIPTION =
  "High-protein, high-fiber recipes that batch-prep well and stay easy to cook. Every one has been cooked and tested.";

export const metadata: Metadata = {
  title: "Recipes - Liam Davis",
  description: DESCRIPTION,
  alternates: { canonical: "/recipes" },
  openGraph: { type: "website", url: "/recipes", title: "Recipes", description: DESCRIPTION },
  twitter: { card: "summary", title: "Recipes", description: DESCRIPTION },
};

export default function RecipesPage() {
  const recipes = loadRecipes();
  return (
    <main className="min-h-screen w-full overflow-x-clip bg-black text-white">
      <AnnouncementBar />
      <SiteNav current="recipes" />
      <Hero />
      <section className="w-full bg-black">
        <ul className="mx-auto grid w-full max-w-[1800px] grid-cols-1 gap-x-10 px-6 pb-24 md:grid-cols-2 md:px-16 md:pb-32 xl:grid-cols-3">
          {recipes.map((recipe, i) => (
            <li key={recipe.slug}>
              <RecipeCard recipe={recipe} number={recipes.length - i} />
            </li>
          ))}
        </ul>
      </section>
      <RecipesFooter />
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Hero - page title + intro                                           */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="relative w-full overflow-hidden bg-black">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage:
            "radial-gradient(circle at center, rgba(255,255,255,0.5) 0.6px, transparent 0.8px)",
          backgroundSize: "18px 18px",
          maskImage:
            "radial-gradient(ellipse 60% 50% at 75% 55%, black 40%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 60% 50% at 75% 55%, black 40%, transparent 85%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-[1800px] px-6 pb-16 pt-20 md:px-16 md:pb-20 md:pt-28">
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <span className="section-tag text-white/60">/00 - RECIPES</span>
          <span className="section-tag text-white/60">TESTED IN MY KITCHEN</span>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-10 md:mt-20 md:grid-cols-12">
          <div className="col-span-1 md:col-span-9">
            <p className="label-sm mb-5 text-white/60">THE KITCHEN</p>
            <h1 className="display-serif text-[clamp(2.25rem,7vw,7rem)] leading-[1] text-white">
              Cooked, tested,
              <br />
              <em className="text-white/85">written down</em>.
            </h1>
          </div>
          <div className="col-span-1 flex items-end md:col-span-3">
            <p className="font-serif text-[18px] leading-[1.3] text-white/70">{DESCRIPTION}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Recipe card                                                         */
/* ------------------------------------------------------------------ */

function RecipeCard({ recipe, number }: { recipe: Recipe; number: number }) {
  return (
    <Link
      href={`/recipes/${recipe.slug}`}
      className="group flex h-full flex-col border-t border-white/12 py-10 transition-colors hover:bg-white/[0.02]"
    >
      {recipe.image && (
        <div className="relative mb-8 aspect-[4/3] w-full overflow-hidden bg-white/5">
          <Image
            src={recipe.image.src}
            alt=""
            fill
            sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        </div>
      )}
      <div className="flex items-baseline justify-between gap-4">
        <span className="section-tag text-white/60">/{String(number).padStart(2, "0")}</span>
        <span className="label-sm text-white/60">{formatDate(recipe.date)}</span>
      </div>

      <h2 className="display-serif mt-8 text-[clamp(1.75rem,3vw,2.75rem)] text-white">
        {recipe.title}
      </h2>
      <p className="mt-4 font-serif text-[17px] leading-[1.35] text-white/75">{recipe.summary}</p>

      <dl className="mt-8 flex gap-10">
        <div>
          <dt className="label-sm text-white/60">TOTAL</dt>
          <dd className="mt-2 font-serif text-[20px] text-white">{formatMinutes(recipe.totalMinutes)}</dd>
        </div>
        <div>
          <dt className="label-sm text-white/60">PROTEIN PER SERVING</dt>
          <dd className="mt-2 font-serif text-[20px] text-white">{recipe.nutrition.protein} g</dd>
        </div>
      </dl>

      <ul role="list" className="mt-6 flex flex-wrap gap-2" aria-label="Tags">
        {recipe.tags.map((tag, i) => (
          <li key={`${i}-${tag}`} className="label-sm border border-white/20 px-2 py-1.5 text-white/70">
            {tag.replace(/-/g, " ")}
          </li>
        ))}
      </ul>

      <span className="label mt-auto inline-flex items-center gap-2 pt-8 text-white transition-colors group-hover:text-[var(--color-acid)]">
        VIEW RECIPE
        <Arrow className="h-3 w-3" />
      </span>
    </Link>
  );
}
