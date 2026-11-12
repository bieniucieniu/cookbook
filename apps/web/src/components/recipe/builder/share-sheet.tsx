import { IconShare, IconTrash } from "@/components/icons";
import { Button, ToggleButton } from "@/components/m3/button";
import { ButtonGroup } from "@/components/m3/button-group";
import { IconButton } from "@/components/m3/icon-button";
import {
  SideSheet,
  SideSheetBody,
  SideSheetClose,
  SideSheetContent,
  SideSheetHeader,
  SideSheetOverlay,
  SideSheetPortal,
  SideSheetTitle,
  SideSheetTrigger,
} from "@/components/m3/side-sheet";
import {
  TextField,
  TextFieldContainer,
  TextFieldInput,
  TextFieldLabel,
} from "@/components/m3/text-field";
import { notify } from "@/components/notify";
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
    } catch (error) {
      notify(`Could not share${error instanceof Error ? `: ${error.message}` : "."}`);
    }
  };

  return (
    <Show when={rows()}>
      {(items) => (
        <SideSheet>
          <SideSheetTrigger as={Button} variant="tonal" size="sm">
            <IconShare aria-hidden="true" />
            Share
          </SideSheetTrigger>
          <SideSheetPortal>
            <SideSheetOverlay />
            <SideSheetContent class="[--text-field-notch:var(--md-sys-color-surface-container-low)]">
              <SideSheetHeader>
                <SideSheetTitle class="flex-1">Share</SideSheetTitle>
                <SideSheetClose />
              </SideSheetHeader>
              <SideSheetBody class="flex flex-col gap-6">
                <ul class="flex flex-col gap-1" aria-label="People with access">
                  <For
                    each={items()}
                    fallback={
                      <li class="typescale-body-medium text-on-surface-variant">Only you.</li>
                    }
                  >
                    {(grant) => (
                      <li class="flex min-h-14 items-center gap-3">
                        <div class="flex min-w-0 flex-1 flex-col">
                          <span class="truncate typescale-body-large text-on-surface">
                            {grant.email}
                          </span>
                          <span class="typescale-body-medium text-on-surface-variant">
                            {grant.permission === "write" ? "Can edit" : "Can view"}
                          </span>
                        </div>
                        <IconButton
                          aria-label={`Remove ${grant.email}`}
                          onClick={() => {
                            void revoke
                              .mutateAsync({ id: props.recipeId, userId: String(grant.userId) })
                              .then(() => refresh())
                              .catch((error: unknown) =>
                                notify(
                                  `Could not remove ${grant.email}${error instanceof Error ? `: ${error.message}` : "."}`
                                )
                              );
                          }}
                        >
                          <IconTrash aria-hidden="true" />
                        </IconButton>
                      </li>
                    )}
                  </For>
                </ul>
                <form class="flex flex-col gap-4" onSubmit={onGrant}>
                  <TextField variant="outlined" value={email()} onChange={setEmail} required>
                    <TextFieldContainer>
                      <TextFieldLabel>Email</TextFieldLabel>
                      <TextFieldInput type="email" />
                    </TextFieldContainer>
                  </TextField>
                  <ButtonGroup variant="connected" size="sm" aria-label="Permission">
                    <ToggleButton
                      variant="tonal"
                      pressed={permission() === "read"}
                      onChange={() => setPermission("read")}
                    >
                      Can view
                    </ToggleButton>
                    <ToggleButton
                      variant="tonal"
                      pressed={permission() === "write"}
                      onChange={() => setPermission("write")}
                    >
                      Can edit
                    </ToggleButton>
                  </ButtonGroup>
                  <Button type="submit" class="w-fit" disabled={upsert.isPending}>
                    Share
                  </Button>
                </form>
              </SideSheetBody>
            </SideSheetContent>
          </SideSheetPortal>
        </SideSheet>
      )}
    </Show>
  );
}
