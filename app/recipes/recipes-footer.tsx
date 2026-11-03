import { SiteFooter } from "@/components/site-chrome";

/** Footer shared by the recipes index and every recipe page. */
export function RecipesFooter() {
  return (
    <SiteFooter
      tag="/99 - GET IN TOUCH"
      projectLinks={[
        { label: "STAYZA", href: "https://trystayza.com" },
        { label: "ALL PROJECTS", href: "/projects" },
        { label: "RECIPES", href: "/recipes" },
        { label: "HOME", href: "/" },
      ]}
    />
  );
}
