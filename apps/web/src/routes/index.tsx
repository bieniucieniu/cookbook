import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Table } from "@/components/ui/table";
import { useCurrentUser } from "@/generated/auth/auth";
import type { RecipeListItem } from "@/generated/model";
import { type listRecipesResponse, useListRecipes } from "@/generated/recipes/recipes";
import { signedIn } from "@/lib/session";
import { Link, createFileRoute } from "@tanstack/solid-router";
import { For, Show } from "solid-js";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const recipes = useListRecipes();
  const session = useCurrentUser();
  return (
    <main class="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <div class="flex items-center justify-between gap-3">
        <h1 class="text-sm font-medium">Recipes</h1>
        <Show when={signedIn(session.data)}>
          <Link to="/recipes/new" class="text-xs underline">
            New recipe
          </Link>
        </Show>
      </div>
      <Show when={recipes.isPending}>
        <Spinner />
      </Show>
      <Show when={recipes.isError}>
        <Alert>
          <Alert.Title>Could not load recipes</Alert.Title>
          <Alert.Description>{recipes.error?.message}</Alert.Description>
        </Alert>
      </Show>
      <Show when={listed(recipes.data)}>
        {(items) => (
          <Show
            when={items().length > 0}
            fallback={<p class="text-xs text-muted-foreground">No recipes yet.</p>}
          >
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Title</Table.Head>
                  <Table.Head>Visibility</Table.Head>
                  <Table.Head>Hands-on</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                <For each={items()}>
                  {(recipe) => (
                    <Table.Row>
                      <Table.Cell>
                        <Link
                          to="/recipes/$id"
                          params={{ id: String(recipe.id) }}
                          class="underline"
                        >
                          {recipe.title}
                        </Link>
                      </Table.Cell>
                      <Table.Cell>{recipe.visibility}</Table.Cell>
                      <Table.Cell>
                        {formatSpan(recipe.handsOnMinSeconds, recipe.handsOnMaxSeconds)}
                      </Table.Cell>
                    </Table.Row>
                  )}
                </For>
              </Table.Body>
            </Table>
          </Show>
        )}
      </Show>
    </main>
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
