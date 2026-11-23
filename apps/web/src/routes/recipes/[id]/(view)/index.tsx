import { IconChefHat } from "@/components/icons";
import { iconButtonVariants } from "@/components/m3/icon-button";
import { useRecipeView } from "@/components/recipe/view/context";
import { RecipeList } from "@/components/recipe/view/recipe-list";
import { createFileRoute, Link } from "@tanstack/solid-router";

export const Route = createFileRoute("/recipes/$id/_view/")({
  component: RecipeListPage,
});

function RecipeListPage() {
  const params = Route.useParams();
  const view = useRecipeView();
  return (
    <RecipeList
      draft={view.draft()}
      cooks={view.cooks()}
      catalog={view.catalog}
      stepAction={(node) => (
        <Link
          to="/recipes/$id/$step"
          params={{ id: params().id, step: node.key }}
          aria-label={`Cook ${node.title}`}
          title="Cook this step"
          class={iconButtonVariants({ variant: "tonal", size: "xs" })}
        >
          <IconChefHat aria-hidden="true" />
        </Link>
      )}
    />
  );
}
