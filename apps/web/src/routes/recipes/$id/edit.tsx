import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { isStage, type StageId } from "@/components/recipe/builder/stages";
import { RecipeBuilder } from "@/components/recipe/builder/recipe-builder";
import type { RecipeDetail } from "@/generated/model";
import { getGetRecipeQueryOptions, type getRecipeResponse } from "@/generated/recipes/recipes";
import { detailToDraft } from "@/lib/recipe-draft";
import { ApiError } from "@/mutator";
import { useQuery } from "@tanstack/solid-query";
import { Link, createFileRoute } from "@tanstack/solid-router";
import { Show } from "solid-js";

export const Route = createFileRoute("/recipes/$id/edit")({
  validateSearch: (search: Record<string, unknown>): { stage?: StageId } =>
    isStage(search.stage) ? { stage: search.stage } : {},
  component: EditRecipePage,
});

function EditRecipePage() {
  const params = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const recipe = useQuery(() => getGetRecipeQueryOptions(params().id));
  const detail = () => recipeDetail(recipe.data);
  return (
    <main class="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 pt-2">
      <Link to="/recipes/$id" params={{ id: params().id }} class="text-sm text-muted-foreground">
        Back to recipe
      </Link>
      <Show when={recipe.isPending}>
        <Spinner />
      </Show>
      <Show when={recipe.isError}>
        <Alert variant="destructive">
          <AlertTitle>
            {recipe.error instanceof ApiError && recipe.error.status === 404
              ? "Recipe not found"
              : "Could not load the recipe"}
          </AlertTitle>
          <AlertDescription>{recipe.error?.message}</AlertDescription>
        </Alert>
      </Show>
      <Show when={detail()}>
        {(item) => (
          <RecipeBuilder
            initial={detailToDraft(item())}
            recipeId={params().id}
            stage={search().stage ?? "steps"}
            onStage={(stage) => void navigate({ search: { stage } })}
          />
        )}
      </Show>
    </main>
  );
}

function recipeDetail(result: getRecipeResponse | undefined): RecipeDetail | undefined {
  if (!result || result.status !== 200) return undefined;
  return result.data;
}
