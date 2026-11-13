import { useRecipeView } from "@/components/recipe/view/context";
import { RecipeList } from "@/components/recipe/view/recipe-list";
import { createFileRoute } from "@tanstack/solid-router";

export const Route = createFileRoute("/recipes/$id/_view/")({
  component: RecipeListPage,
});

function RecipeListPage() {
  const view = useRecipeView();
  return <RecipeList draft={view.draft()} cooks={view.cooks()} catalog={view.catalog} />;
}
