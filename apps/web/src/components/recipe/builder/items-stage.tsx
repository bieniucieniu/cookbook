import { IconArrowsShuffle, IconCarrot, IconToolsKitchen2, IconTrash } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Catalog, CatalogKind } from "@/lib/catalog";
import type { RecipeDraft } from "@/lib/recipe-draft";
import { For, Show } from "solid-js";
import { ItemPicker } from "../item-picker";
import { IconLabel, ItemChip } from "../parts";
import type { DraftActions } from "./actions";

/** Mise en place: everything the recipe needs, before saying how it is used. */
export function ItemsStage(props: { draft: RecipeDraft; actions: DraftActions; catalog: Catalog }) {
  return (
    <div class="flex flex-col gap-8">
      <PantrySection kind="ingredient" {...props} />
      <PantrySection kind="tool" {...props} />
    </div>
  );
}

function PantrySection(props: {
  kind: CatalogKind;
  draft: RecipeDraft;
  actions: DraftActions;
  catalog: Catalog;
}) {
  const ids = () =>
    props.kind === "ingredient" ? props.draft.pantry.ingredients : props.draft.pantry.tools;
  const uses = (id: number) =>
    props.draft.nodes.filter((node) =>
      props.kind === "ingredient"
        ? node.ingredients.some((item) => item.ingredientId === id)
        : node.tools.some((item) => item.toolId === id)
    ).length;
  const recipeAlt = (id: number) =>
    props.draft.ingredientAlts.find(
      (alt) => alt.ingredientId === id && (alt.nodeKey ?? null) === null
    );

  return (
    <section class="flex flex-col gap-3">
      <h2 class="text-base font-semibold">
        <IconLabel
          icon={props.kind === "ingredient" ? IconCarrot : IconToolsKitchen2}
          label={props.kind === "ingredient" ? "Ingredients" : "Tools"}
        />
      </h2>
      <Show
        when={ids().length > 0}
        fallback={
          <Empty class="border border-dashed py-6">
            <EmptyHeader>
              <EmptyTitle>
                {props.kind === "ingredient" ? "No ingredients yet" : "No tools yet"}
              </EmptyTitle>
              <EmptyDescription>
                {props.kind === "ingredient"
                  ? "Search below. Amounts go on each step."
                  : "Search below."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      >
        <ul class="flex flex-wrap gap-2">
          <For each={ids()}>
            {(id) => (
              <li>
                <Popover>
                  <PopoverTrigger
                    as={ItemChip}
                    kind={props.kind}
                    name={props.catalog.name(props.kind, id)}
                  />
                  <PopoverPortal>
                    <PopoverContent>
                      <PopoverTitle class="text-sm font-semibold">
                        {props.catalog.name(props.kind, id)}
                      </PopoverTitle>
                      <p class="text-sm text-muted-foreground">
                        {uses(id) === 0
                          ? "Not in any step yet"
                          : `In ${uses(id)} step${uses(id) === 1 ? "" : "s"}`}
                      </p>
                      <Show when={props.kind === "ingredient"}>
                        <div class="flex flex-col gap-2">
                          <IconLabel
                            icon={IconArrowsShuffle}
                            label="Swap with"
                            class="text-xs font-medium"
                          />
                          <Show when={recipeAlt(id)}>
                            {(alt) => (
                              <div class="flex items-center gap-2">
                                <ItemChip
                                  kind="ingredient"
                                  name={props.catalog.name("ingredient", alt().altIngredientId)}
                                />
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  variant="ghost"
                                  aria-label="Remove swap"
                                  onClick={() => props.actions.setIngredientAlt(id, null, null)}
                                >
                                  <IconTrash aria-hidden="true" />
                                </Button>
                              </div>
                            )}
                          </Show>
                          <ItemPicker
                            kind="ingredient"
                            catalog={props.catalog}
                            exclude={[id]}
                            placeholder="Any step can use…"
                            onPick={(altId) => props.actions.setIngredientAlt(id, altId, null)}
                          />
                        </div>
                      </Show>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => props.actions.pantryRemove(props.kind, id)}
                      >
                        <IconTrash aria-hidden="true" />
                        Remove from recipe
                      </Button>
                    </PopoverContent>
                  </PopoverPortal>
                </Popover>
              </li>
            )}
          </For>
        </ul>
      </Show>
      <ItemPicker
        kind={props.kind}
        catalog={props.catalog}
        exclude={ids()}
        onPick={(id) => props.actions.pantryAdd(props.kind, id)}
      />
    </section>
  );
}
