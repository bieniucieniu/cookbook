import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
          <AlertTitle>Could not load recipes</AlertTitle>
          <AlertDescription>{recipes.error?.message}</AlertDescription>
        </Alert>
      </Show>
      <Show when={listed(recipes.data)}>
        {(items) => (
          <Show
            when={items().length > 0}
            fallback={<p class="text-xs text-muted-foreground">No recipes yet.</p>}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Hands-on</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <For each={items()}>
                  {(recipe) => (
                    <TableRow>
                      <TableCell>
                        <Link
                          to="/recipes/$id"
                          params={{ id: String(recipe.id) }}
                          class="underline"
                        >
                          {recipe.title}
                        </Link>
                      </TableCell>
                      <TableCell>{recipe.visibility}</TableCell>
                      <TableCell>
                        {formatSpan(recipe.handsOnMinSeconds, recipe.handsOnMaxSeconds)}
                      </TableCell>
                    </TableRow>
                  )}
                </For>
              </TableBody>
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
