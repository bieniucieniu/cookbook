import { photoUrl } from "@/lib/api";
import {
  IconChefHat,
  IconClock,
  IconDots,
  IconHandStop,
  IconLayoutList,
  IconLock,
  IconPencil,
  IconTrash,
} from "@/components/icons";
import { Button, ToggleButton } from "@/components/m3/button";
import { ButtonGroup } from "@/components/m3/button-group";
import {
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeadline,
  DialogIcon,
  DialogOverlay,
} from "@/components/m3/dialog";
import { iconButtonVariants } from "@/components/m3/icon-button";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuItemIcon,
  MenuItemLabel,
  MenuTrigger,
} from "@/components/m3/menu";
import { PageErrored, PageLoading } from "@/components/page-state";
import { MarkdownView } from "@/components/recipe/markdown";
import { IconLabel, Stepper } from "@/components/recipe/parts";
import { RecipeViewContext } from "@/components/recipe/view/context";
import { Recipes } from "@/generated/recipes/recipes";
import { preloadCatalog, useCatalog } from "@/lib/catalog";
import { detailToDraft } from "@/lib/recipe-draft";
import { lanes } from "@/lib/recipe-graph";
import { createSubmit } from "@/lib/submit";
import { signedIn, useSession } from "@/lib/session";
import { formatSpan } from "@/lib/units";
import {
  type RouteDefinition,
  type RouteSectionProps,
  useMatch,
  useNavigate,
  useParams,
} from "@solidjs/router";
import type { JSX } from "@solidjs/web";
import { createMemo, createSignal, For, Loading, Show } from "solid-js";
import { paths } from "@/paths";

const viewButtons = [
  { value: "list", label: "List", icon: IconLayoutList },
  { value: "cook", label: "Cook", icon: IconChefHat },
] as const;

export const route = {
  preload: ({ params }) => {
    void Recipes.getRecipe(params.id ?? "");
    preloadCatalog();
  },
} satisfies RouteDefinition;

/**
 * Pathless layout for a recipe: the header, the List / Cook switch, and the cook count stay
 * put while the list (`/recipes/:id`) and the cook steps (`/recipes/:id/:step`) swap below.
 */
export default function RecipeLayout(props: RouteSectionProps) {
  const params = useParams();
  return (
    <main class="flex w-full flex-col gap-6 px-4 pt-2 pb-8 medium:px-6">
      <PageErrored title="Could not load the recipe" notFoundTitle="Recipe not found">
        <Loading fallback={<PageLoading label="Loading the recipe" />}>
          <RecipeShell id={params.id ?? ""}>{props.children}</RecipeShell>
        </Loading>
      </PageErrored>
    </main>
  );
}

function RecipeShell(props: { id: string; children?: JSX.Element }) {
  const navigate = useNavigate();
  const session = useSession();
  const catalog = useCatalog();
  const detail = createMemo(() => Recipes.getRecipe(props.id));
  const draft = createMemo(() => detailToDraft(detail()));
  const user = () => signedIn(session());
  const cooking = useMatch(() => "/recipes/:id/:step");
  const view = () => (cooking() ? "cook" : "list");
  // Starts at the recipe's own count; the cook can change it. A writable derived signal, so it
  // follows the recipe again only if the recipe itself changes (after an edit).
  // A memo of the number, so revalidating the recipe (after any write) resets the count only when
  // the recipe's own count changed.
  const recipeCooks = createMemo(() => detail().cooks);
  const [cooks, setCooks] = createSignal(() => recipeCooks());
  const [confirmDelete, setConfirmDelete] = createSignal(false);
  const [deleting, submit] = createSubmit();

  const onDelete = async () => {
    const deleted = await submit("delete the recipe", async () => {
      await Recipes.deleteRecipe(props.id);
      return true;
    });
    setConfirmDelete(false);
    if (deleted) navigate(paths());
  };

  const openView = (value: "list" | "cook") => {
    if (value === "list") {
      navigate(paths.recipes(props.id));
      return;
    }
    const first = lanes(draft().nodes, draft().edges)[0]?.[0];
    if (first) navigate(paths.recipes(props.id)(first.key));
  };

  return (
    <RecipeViewContext
      value={{
        recipeId: () => props.id,
        detail,
        draft,
        cooks,
        catalog,
        userId: () => user()?.id,
      }}
    >
      {/* Shown in every view, so switching List / Cook keeps the recipe in place. */}
      <header class="flex flex-col gap-5">
        <Show when={detail().photos?.[0]}>
          {(photo) => (
            <img
              src={photoUrl(photo().id)}
              alt={photo().alt ?? ""}
              class="aspect-[21/9] max-h-80 w-full rounded-extra-large object-cover"
            />
          )}
        </Show>
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="flex min-w-0 flex-col gap-2">
            <h1 class="typescale-emphasized-headline-large text-on-surface">{detail().title}</h1>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 typescale-label-large text-on-surface-variant">
              <IconLabel
                icon={IconClock}
                label={formatSpan(detail().elapsedMinSeconds, detail().elapsedMaxSeconds)}
              />
              <IconLabel
                icon={IconHandStop}
                label={`${formatSpan(detail().handsOnMinSeconds, detail().handsOnMaxSeconds)} hands on`}
              />
              <Show when={detail().visibility === "private"}>
                <IconLabel icon={IconLock} label="Only you" />
              </Show>
            </div>
          </div>
          <Show when={user()}>
            <div class="flex items-center gap-1">
              <Button onClick={() => navigate(paths.recipes(props.id).edit)}>
                <IconPencil aria-hidden="true" />
                Edit
              </Button>
              <Menu>
                <MenuTrigger aria-label="More actions" class={iconButtonVariants()}>
                  <IconDots aria-hidden="true" />
                </MenuTrigger>
                <MenuContent align="end" class="min-w-48">
                  <MenuItem onSelect={() => setConfirmDelete(true)}>
                    <MenuItemIcon>
                      <IconTrash aria-hidden="true" />
                    </MenuItemIcon>
                    <MenuItemLabel>Delete recipe</MenuItemLabel>
                  </MenuItem>
                </MenuContent>
              </Menu>
              <Dialog open={confirmDelete()} onOpenChange={(open) => setConfirmDelete(open)}>
                <DialogOverlay />
                <DialogContent>
                  <DialogIcon>
                    <IconTrash aria-hidden="true" />
                  </DialogIcon>
                  <DialogHeadline>Delete “{detail().title}”?</DialogHeadline>
                  <DialogDescription>This cannot be undone.</DialogDescription>
                  <DialogActions>
                    <DialogClose>Keep</DialogClose>
                    <Button variant="text" disabled={deleting()} onClick={() => void onDelete()}>
                      Delete
                    </Button>
                  </DialogActions>
                </DialogContent>
              </Dialog>
            </div>
          </Show>
        </div>
        <Show when={detail().description.trim()}>
          <MarkdownView value={detail().description} />
        </Show>
      </header>

      <div class="flex flex-wrap items-center justify-between gap-3">
        <ButtonGroup variant="connected" size="sm" aria-label="View">
          <For each={viewButtons}>
            {(option) => {
              const Icon = option.icon;
              return (
                <ToggleButton
                  variant="tonal"
                  pressed={view() === option.value}
                  onPressedChange={() => openView(option.value)}
                >
                  <Icon aria-hidden="true" />
                  {option.label}
                </ToggleButton>
              );
            }}
          </For>
        </ButtonGroup>
        <Stepper label="cooks" value={cooks()} onChange={setCooks} max={24} />
      </div>

      {props.children}
    </RecipeViewContext>
  );
}
