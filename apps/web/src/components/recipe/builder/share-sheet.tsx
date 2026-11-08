import { IconShare, IconTrash } from "@/components/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, InputControl, InputLabel } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { RecipeGrant } from "@/generated/model";
import {
  getListRecipeGrantsQueryKey,
  getListRecipeGrantsQueryOptions,
  useDeleteRecipeGrant,
  useUpsertRecipeGrant,
  type listRecipeGrantsResponse,
} from "@/generated/recipes/recipes";
import { useQuery, useQueryClient } from "@tanstack/solid-query";
import { createSignal, For, Show } from "solid-js";

function grantRows(result: listRecipeGrantsResponse | undefined): RecipeGrant[] | undefined {
  if (!result || result.status !== 200) return undefined;
  return result.data;
}

/** Owner-only grants. Hidden when the grants list is not readable (not the owner). */
export function ShareSheet(props: { recipeId: string }) {
  const queryClient = useQueryClient();
  const grants = useQuery(() => ({
    ...getListRecipeGrantsQueryOptions(props.recipeId),
    retry: false,
  }));
  const rows = () => grantRows(grants.data);
  const upsert = useUpsertRecipeGrant();
  const revoke = useDeleteRecipeGrant();
  const [email, setEmail] = createSignal("");
  const [permission, setPermission] = createSignal<"read" | "write">("read");

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: getListRecipeGrantsQueryKey(props.recipeId) });

  const onGrant = async (event: SubmitEvent) => {
    event.preventDefault();
    try {
      await upsert.mutateAsync({
        id: props.recipeId,
        data: { email: email().trim(), permission: permission() },
      });
      setEmail("");
      await refresh();
    } catch {
      return;
    }
  };

  return (
    <Show when={rows()}>
      {(items) => (
        <Sheet>
          <SheetTrigger as={Button} variant="outline" size="lg">
            <IconShare aria-hidden="true" />
            Share
          </SheetTrigger>
          <SheetPortal>
            <SheetContent side="right" class="w-full sm:max-w-sm">
              <SheetHeader>
                <SheetTitle class="text-base">Share</SheetTitle>
              </SheetHeader>
              <ul class="flex flex-col gap-2">
                <For
                  each={items()}
                  fallback={<li class="text-sm text-muted-foreground">Only you.</li>}
                >
                  {(grant) => (
                    <li class="flex items-center justify-between gap-2 text-sm">
                      <span class="min-w-0 truncate">{grant.email}</span>
                      <span class="text-xs text-muted-foreground">
                        {grant.permission === "write" ? "Can edit" : "Can view"}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${grant.email}`}
                        onClick={() => {
                          void revoke
                            .mutateAsync({ id: props.recipeId, userId: String(grant.userId) })
                            .then(() => refresh())
                            .catch(() => undefined);
                        }}
                      >
                        <IconTrash aria-hidden="true" />
                      </Button>
                    </li>
                  )}
                </For>
              </ul>
              <form class="flex flex-col gap-3" onSubmit={onGrant}>
                <Input value={email()} onChange={setEmail} required>
                  <InputLabel>Email</InputLabel>
                  <InputControl type="email" class="h-10" />
                </Input>
                <ToggleGroup
                  variant="outline"
                  spacing={0}
                  value={permission()}
                  onChange={(value) => {
                    if (value === "read" || value === "write") setPermission(value);
                  }}
                >
                  <ToggleGroupItem value="read">Can view</ToggleGroupItem>
                  <ToggleGroupItem value="write">Can edit</ToggleGroupItem>
                </ToggleGroup>
                <Button type="submit" disabled={upsert.isPending}>
                  Share
                </Button>
              </form>
              <Show when={upsert.error}>
                <Alert variant="destructive">
                  <AlertTitle>Could not share</AlertTitle>
                  <AlertDescription>{upsert.error?.message}</AlertDescription>
                </Alert>
              </Show>
            </SheetContent>
          </SheetPortal>
        </Sheet>
      )}
    </Show>
  );
}
