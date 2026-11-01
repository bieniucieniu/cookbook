import { RecipeForm } from "@/components/recipe-form";
import { blankDraft } from "@/lib/recipe-draft";
import { Link, createFileRoute } from "@tanstack/solid-router";

export const Route = createFileRoute("/recipes/new")({
  component: NewRecipePage,
});

function NewRecipePage() {
  return (
    <main class="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <Link to="/" class="text-xs text-muted-foreground">
        Recipes
      </Link>
      <h1 class="text-sm font-medium">New recipe</h1>
      <RecipeForm initial={blankDraft()} />
    </main>
  );
}
