import { ErrorBlock, PageLoading } from "@/components/page-state";
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
    <main class="flex w-full flex-col gap-2 px-4 medium:px-6">
      <Show when={recipe.isPending}>
        <PageLoading label="Loading the recipe" />
      </Show>
      <Show when={recipe.isError}>
        <ErrorBlock
          title={
            recipe.error instanceof ApiError && recipe.error.status === 404
              ? "Recipe not found"
              : "Could not load the recipe"
          }
          detail={recipe.error?.message}
        />
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
