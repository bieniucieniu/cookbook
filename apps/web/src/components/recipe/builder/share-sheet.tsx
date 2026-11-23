import { IconShare, IconTrash } from "@/components/icons";
import { Button, buttonVariants, ToggleButton } from "@/components/m3/button";
import { ButtonGroup } from "@/components/m3/button-group";
import { IconButton } from "@/components/m3/icon-button";
import {
  SideSheet,
  SideSheetBody,
  SideSheetClose,
  SideSheetContent,
  SideSheetHeader,
  SideSheetOverlay,
  SideSheetTitle,
  SideSheetTrigger,
} from "@/components/m3/side-sheet";
import {
  TextField,
  TextFieldContainer,
  TextFieldInput,
  TextFieldLabel,
} from "@/components/m3/text-field";
import { Recipes } from "@/generated/recipes/recipes";
import { createSubmit } from "@/lib/submit";
import { createMemo, createSignal, For, Loading, Show } from "solid-js";

/** Owner-only grants. Hidden while loading and when the list is not readable (not the owner). */
export function ShareSheet(props: { recipeId: string }) {
  return (
    <Loading fallback={null}>
      <Sheet recipeId={props.recipeId} />
    </Loading>
  );
}

function Sheet(props: { recipeId: string }) {
  const rows = createMemo(async () => {
    try {
      return await Recipes.listRecipeGrants(props.recipeId);
    } catch {
      return undefined;
    }
  });
  const [email, setEmail] = createSignal("");
  const [permission, setPermission] = createSignal<"read" | "write">("read");
  const [sharing, submit] = createSubmit();
  const [, remove] = createSubmit();

  const onGrant = async (event: SubmitEvent) => {
    event.preventDefault();
    const shared = await submit("share", () =>
      Recipes.upsertRecipeGrant(props.recipeId, { email: email().trim(), permission: permission() })
    );
    if (shared) setEmail("");
  };

  return (
    <Show when={rows()}>
      {(items) => (
        <SideSheet>
          <SideSheetTrigger class={buttonVariants({ variant: "tonal", size: "sm" })}>
            <IconShare aria-hidden="true" />
            Share
          </SideSheetTrigger>
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
                          void remove(`remove ${grant.email}`, () =>
                            Recipes.deleteRecipeGrant(props.recipeId, String(grant.userId))
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
                <TextField variant="outlined">
                  <TextFieldContainer>
                    <TextFieldLabel>Email</TextFieldLabel>
                    <TextFieldInput
                      type="email"
                      required
                      value={email()}
                      onValueChange={setEmail}
                    />
                  </TextFieldContainer>
                </TextField>
                <ButtonGroup variant="connected" size="sm" aria-label="Permission">
                  <ToggleButton
                    variant="tonal"
                    pressed={permission() === "read"}
                    onPressedChange={() => setPermission("read")}
                  >
                    Can view
                  </ToggleButton>
                  <ToggleButton
                    variant="tonal"
                    pressed={permission() === "write"}
                    onPressedChange={() => setPermission("write")}
                  >
                    Can edit
                  </ToggleButton>
                </ButtonGroup>
                <Button type="submit" class="w-fit" disabled={sharing()}>
                  Share
                </Button>
              </form>
            </SideSheetBody>
          </SideSheetContent>
        </SideSheet>
      )}
    </Show>
  );
}
