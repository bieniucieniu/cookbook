import type { RecipeDetail } from "@/generated/model";
import type { Catalog } from "@/lib/catalog";
import type { RecipeDraft } from "@/lib/recipe-draft";
import { type Accessor, createContext, useContext } from "solid-js";

/** What the recipe layout loads once for the list and the cook steps under it. */
export type RecipeView = {
  recipeId: Accessor<string>;
  detail: Accessor<RecipeDetail>;
  draft: Accessor<RecipeDraft>;
  /** Cooks to scale amounts to. Kept when moving between the list and the steps. */
  cooks: Accessor<number>;
  catalog: Catalog;
  userId: Accessor<number | undefined>;
};

/** Provided by the recipe layout route. Without it, `useContext` throws ContextNotFoundError. */
export const RecipeViewContext = createContext<RecipeView>();

export function useRecipeView(): RecipeView {
  return useContext(RecipeViewContext);
}
