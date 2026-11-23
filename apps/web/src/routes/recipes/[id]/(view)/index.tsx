import { IconChefHat } from "@/components/icons";
import { iconButtonVariants } from "@/components/m3/icon-button";
import { useRecipeView } from "@/components/recipe/view/context";
import { RecipeList } from "@/components/recipe/view/recipe-list";
import { paths } from "@/paths";

export default function RecipeListPage() {
  const view = useRecipeView();
  return (
    <RecipeList
      draft={view.draft()}
      cooks={view.cooks()}
      catalog={view.catalog}
      stepAction={(node) => (
        <a
          href={paths.recipes(view.recipeId())(node.key)}
          aria-label={`Cook ${node.title}`}
          title="Cook this step"
          class={iconButtonVariants({ variant: "tonal", size: "xs" })}
        >
          <IconChefHat aria-hidden="true" />
        </a>
      )}
    />
  );
}
