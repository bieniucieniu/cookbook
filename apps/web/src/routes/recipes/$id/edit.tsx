import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { RecipeEditor, type EditorPane } from "@/components/recipe/builder/recipe-editor";
import type { RecipeDetail } from "@/generated/model";
import { getGetRecipeQueryOptions, type getRecipeResponse } from "@/generated/recipes/recipes";
import { detailToDraft } from "@/lib/recipe-draft";
import { ApiError } from "@/mutator";
import { useQuery } from "@tanstack/solid-query";
import { createFileRoute } from "@tanstack/solid-router";
import { Show } from "solid-js";

export const Route = createFileRoute("/recipes/$id/edit")({
  validateSearch: editorSearch,
  component: EditRecipePage,
});

function EditRecipePage() {
  const params = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const recipe = useQuery(() => getGetRecipeQueryOptions(params().id));
  const detail = () => recipeDetail(recipe.data);
  return (
    <main class="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 pt-2">
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
          <RecipeEditor
            initial={detailToDraft(item())}
            recipeId={params().id}
            selected={search().step}
            pane={search().pane ?? "step"}
            onSelect={(step) =>
              void navigate({ search: (prev) => ({ ...prev, step }), replace: true })
            }
            onPane={(pane) =>
              void navigate({ search: (prev) => ({ ...prev, pane }), replace: true })
            }
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

function editorSearch(search: Record<string, unknown>): { step?: string; pane?: EditorPane } {
  return {
    ...(typeof search.step === "string" && search.step ? { step: search.step } : {}),
    ...(search.pane === "flow" || search.pane === "step" ? { pane: search.pane } : {}),
  };
}
