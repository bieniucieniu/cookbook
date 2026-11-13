import { IconChefHat, IconClock, IconHandStop, IconLock, IconPlus } from "@/components/icons";
import { List, ListItem, ListItemContent, ListItemLeading } from "@/components/m3/list";
import { fabVariants } from "@/components/m3/fab";
import { EmptyState, ErrorBlock, PageLoading } from "@/components/page-state";
import { IconLabel } from "@/components/recipe/parts";
import { useCurrentUser } from "@/generated/auth/auth";
import type { RecipeListItem } from "@/generated/model";
import { type listRecipesResponse, useListRecipes } from "@/generated/recipes/recipes";
import { signedIn } from "@/lib/session";
import { formatSpan } from "@/lib/units";
import { Link, createFileRoute } from "@tanstack/solid-router";
import { For, Show } from "solid-js";

export const Route = createFileRoute("/")({
  component: Home,
});

/** Tile colors cycle through the three accent containers so neighbouring rows differ. */
const tiles = [
  "bg-primary-container text-on-primary-container",
  "bg-secondary-container text-on-secondary-container",
  "bg-tertiary-container text-on-tertiary-container",
];

/** M3 list of recipes: one column on compact, columns of rows from medium up. No cards. */
function Home() {
  const recipes = useListRecipes();
  const session = useCurrentUser();
  return (
    <main class="flex w-full flex-col gap-4 px-4 pt-2 pb-28 medium:px-6">
      <h1 class="typescale-headline-small text-on-surface">Recipes</h1>
      <Show when={recipes.isPending}>
        <PageLoading label="Loading recipes" />
      </Show>
      <Show when={recipes.isError}>
        <ErrorBlock title="Could not load recipes" detail={recipes.error?.message} />
      </Show>
      <Show when={listed(recipes.data)}>
        {(items) => (
          <Show
            when={items().length > 0}
            fallback={
              <EmptyState
                icon={IconChefHat}
                title="No recipes yet"
                description={
                  signedIn(session)
                    ? "Start one with New recipe."
                    : "Log in to write the first one."
                }
              />
            }
          >
            <List
              aria-label="Recipes"
              class="-mx-4 grid py-0 medium:mx-0 medium:grid-cols-2 medium:gap-x-4 expanded:grid-cols-3 large:grid-cols-4 extra-large:grid-cols-5"
            >
              <For each={items()}>{(recipe) => <RecipeRow recipe={recipe} />}</For>
            </List>
          </Show>
        )}
      </Show>
      <Show when={signedIn(session)}>
        <Link
          to="/recipes/new"
          class={fabVariants({
            extended: true,
            class: "fixed right-4 bottom-4 z-30 medium:right-6 medium:bottom-6",
          })}
        >
          <IconPlus aria-hidden="true" />
          New recipe
        </Link>
      </Show>
    </main>
  );
}

/** One list row; the title's link stretches over the whole row. */
function RecipeRow(props: { recipe: RecipeListItem }) {
  return (
    <ListItem class="cursor-pointer rounded-large state-layer [--state-layer-color:var(--md-sys-color-on-surface)] has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-secondary">
      <ListItemLeading>
        <span
          class={`flex size-14 items-center justify-center rounded-large ${tiles[props.recipe.id % tiles.length]}`}
          aria-hidden="true"
        >
          <IconChefHat class="size-7" stroke={1.5} />
        </span>
      </ListItemLeading>
      <ListItemContent class="gap-1">
        {/* Not ListItemHeadline: cn does not merge typescale-*, so its body-large would compete. */}
        <h2 class="truncate typescale-title-medium text-on-surface">
          <Link
            to="/recipes/$id"
            params={{ id: String(props.recipe.id) }}
            class="outline-none after:absolute after:inset-0 after:z-10"
          >
            {props.recipe.title}
          </Link>
        </h2>
        <div class="flex flex-wrap gap-x-4 gap-y-1 typescale-label-large text-on-surface-variant">
          <IconLabel
            icon={IconClock}
            label={formatSpan(props.recipe.elapsedMinSeconds, props.recipe.elapsedMaxSeconds)}
          />
          <IconLabel
            icon={IconHandStop}
            label={`${formatSpan(props.recipe.handsOnMinSeconds, props.recipe.handsOnMaxSeconds)} hands on`}
          />
          <Show when={props.recipe.visibility === "private"}>
            <IconLabel icon={IconLock} label="Only you" />
          </Show>
        </div>
      </ListItemContent>
    </ListItem>
  );
}

function listed(result: listRecipesResponse | undefined): RecipeListItem[] | undefined {
  if (!result || result.status !== 200) return undefined;
  return result.data;
}
