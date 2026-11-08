import { isStage, type StageId } from "@/components/recipe/builder/stages";
import { RecipeBuilder } from "@/components/recipe/builder/recipe-builder";
import { blankDraft } from "@/lib/recipe-draft";
import { Link, createFileRoute } from "@tanstack/solid-router";

export const Route = createFileRoute("/recipes/new")({
  validateSearch: (search: Record<string, unknown>): { stage?: StageId } =>
    isStage(search.stage) ? { stage: search.stage } : {},
  component: NewRecipePage,
});

function NewRecipePage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <main class="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 pt-2">
      <Link to="/" class="text-sm text-muted-foreground">
        Recipes
      </Link>
      <RecipeBuilder
        initial={blankDraft()}
        stage={search().stage ?? "basics"}
        onStage={(stage) => void navigate({ search: { stage } })}
      />
    </main>
  );
}
