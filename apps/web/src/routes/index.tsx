import { IconChefHat, IconClock, IconHandStop, IconLock, IconPlus } from "@/components/icons";
import { Card } from "@/components/m3/card";
import { fabVariants } from "@/components/m3/fab";
import { EmptyState, ErrorBlock, PageLoading } from "@/components/page-state";
import { IconLabel } from "@/components/recipe/parts";
import { useCurrentUser } from "@/generated/auth/auth";
import type { RecipeListItem } from "@/generated/model";
import { type listRecipesResponse, useListRecipes } from "@/generated/recipes/recipes";
import { signedIn } from "@/lib/session";
import { Link, createFileRoute } from "@tanstack/solid-router";
import { For, Show } from "solid-js";

export const Route = createFileRoute("/")({
  component: Home,
});

/** Tile colors cycle through the three accent containers so neighbouring cards differ. */
const tiles = [
  "bg-primary-container text-on-primary-container",
  "bg-secondary-container text-on-secondary-container",
  "bg-tertiary-container text-on-tertiary-container",
];

/** M3 feed layout: one column on compact, a card grid from medium up. */
function Home() {
  const recipes = useListRecipes();
  const session = useCurrentUser();
  return (
    <main class="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pt-2 pb-28 medium:px-6">
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
                  signedIn(session.data)
                    ? "Start one with New recipe."
                    : "Log in to write the first one."
                }
              />
            }
          >
            <ul class="grid gap-3 medium:grid-cols-2 medium:gap-4 expanded:grid-cols-3">
              <For each={items()}>
                {(recipe) => (
                  <li>
                    <RecipeCard recipe={recipe} />
                  </li>
                )}
              </For>
            </ul>
          </Show>
        )}
      </Show>
      <Show when={signedIn(session.data)}>
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

/** The whole card is the link: the title's link stretches over it. */
function RecipeCard(props: { recipe: RecipeListItem }) {
  return (
    <Card
      variant="filled"
      interactive
      class="h-full flex-row items-center gap-0 py-0 has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-secondary"
    >
      <span
        class={`m-3 flex size-16 shrink-0 items-center justify-center rounded-large ${tiles[props.recipe.id % tiles.length]}`}
        aria-hidden="true"
      >
        <IconChefHat class="size-8" stroke={1.5} />
      </span>
      <div class="flex min-w-0 flex-1 flex-col gap-1 py-3 pr-4">
        <h2 class="typescale-title-large text-on-surface">
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
      </div>
    </Card>
  );
}

function listed(result: listRecipesResponse | undefined): RecipeListItem[] | undefined {
  if (!result || result.status !== 200) return undefined;
  return result.data;
}

function formatSpan(minSeconds: number, maxSeconds: number): string {
  const min = formatSeconds(minSeconds);
  const max = formatSeconds(maxSeconds);
  return min === max ? min : `${min}–${max}`;
}

function formatSeconds(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
