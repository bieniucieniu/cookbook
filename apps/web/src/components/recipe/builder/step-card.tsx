import {
  IconArrowDown,
  IconArrowUp,
  IconCarrot,
  IconClock,
  IconCopy,
  IconDots,
  IconGitBranch,
  IconNote,
  IconPlus,
  IconRepeat,
  IconToolsKitchen2,
  IconTrash,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverPortal, PopoverTrigger } from "@/components/ui/popover";
import type { Catalog, CatalogKind } from "@/lib/catalog";
import type { DraftNode, RecipeDraft } from "@/lib/recipe-draft";
import { cn } from "@/lib/utils";
import { createSignal, For, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { IngredientEditor, SpanEditor, ToolEditor } from "../editors";
import { ItemPicker } from "../item-picker";
import { MarkdownEditor } from "../markdown";
import { ItemChip, Stepper } from "../parts";
import type { DraftActions } from "./actions";

/** One step: a short name, then the items it uses and its timers. The note stays folded. */
export function StepCard(props: {
  node: DraftNode;
  number: number;
  draft: RecipeDraft;
  actions: DraftActions;
  catalog: Catalog;
  first: boolean;
  last: boolean;
}) {
  const [noteOpen, setNoteOpen] = createSignal(Boolean(props.node.body.trim()));
  const [repeatOpen, setRepeatOpen] = createSignal(props.node.repeatMin > 1);
  const key = () => props.node.key;
  const stepAlt = (ingredientId: number) =>
    props.draft.ingredientAlts.find(
      (alt) => alt.ingredientId === ingredientId && alt.nodeKey === key()
    );

  return (
    <article
      id={`step-${props.node.key}`}
      class="flex min-w-0 flex-1 flex-col gap-3 rounded-xl border border-border bg-card p-3 text-card-foreground shadow-xs"
    >
      <header class="flex items-center gap-2">
        <span
          class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground tabular-nums"
          aria-hidden="true"
        >
          {props.number}
        </span>
        <input
          class="min-w-0 flex-1 rounded-md bg-transparent px-1 py-1 text-base font-semibold outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
          aria-label={`Step ${props.number} name`}
          placeholder="Name this step"
          value={props.node.title}
          onInput={(event) => props.actions.setStep(key(), "title", event.currentTarget.value)}
        />
        <DropdownMenu>
          <DropdownMenuTrigger
            as={Button}
            variant="ghost"
            size="icon-lg"
            aria-label={`Step ${props.number} options`}
          >
            <IconDots aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent class="min-w-48">
              <DropdownMenuItem
                disabled={props.first}
                onSelect={() => props.actions.moveStep(key(), -1)}
              >
                <IconArrowUp aria-hidden="true" />
                Move up
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={props.last}
                onSelect={() => props.actions.moveStep(key(), 1)}
              >
                <IconArrowDown aria-hidden="true" />
                Move down
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => props.actions.duplicateStep(key())}>
                <IconCopy aria-hidden="true" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => props.actions.branchFrom(key())}>
                <IconGitBranch aria-hidden="true" />
                Do alongside
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setRepeatOpen(true)}>
                <IconRepeat aria-hidden="true" />
                Repeat
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setNoteOpen(true)}>
                <IconNote aria-hidden="true" />
                Note
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => props.actions.removeStep(key())}
              >
                <IconTrash aria-hidden="true" />
                Delete step
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenu>
      </header>

      <div class="flex flex-wrap items-center gap-2">
        <For each={props.node.ingredients}>
          {(item) => (
            <IngredientEditor
              name={props.catalog.name("ingredient", item.ingredientId)}
              item={item}
              onChange={(patch) => props.actions.patchIngredient(key(), item.ingredientId, patch)}
              onRemove={() => props.actions.removeIngredient(key(), item.ingredientId)}
              extra={
                <div class="flex flex-col gap-1">
                  <span class="text-xs font-medium text-muted-foreground">Swap in this step</span>
                  <Show when={stepAlt(item.ingredientId)}>
                    {(alt) => (
                      <ItemChip
                        kind="ingredient"
                        name={props.catalog.name("ingredient", alt().altIngredientId)}
                        aria-label="Remove swap"
                        onClick={() =>
                          props.actions.setIngredientAlt(item.ingredientId, null, key())
                        }
                      />
                    )}
                  </Show>
                  <ItemPicker
                    kind="ingredient"
                    catalog={props.catalog}
                    picked={props.draft.pantry.ingredients}
                    exclude={[item.ingredientId]}
                    placeholder="Or use…"
                    onPick={(altId) =>
                      props.actions.setIngredientAlt(item.ingredientId, altId, key())
                    }
                  />
                </div>
              }
            />
          )}
        </For>
        <For each={props.node.tools}>
          {(item) => (
            <ToolEditor
              name={props.catalog.name("tool", item.toolId)}
              item={item}
              onChange={(patch) => props.actions.patchTool(key(), item.toolId, patch)}
              onRemove={() => props.actions.removeTool(key(), item.toolId)}
            />
          )}
        </For>
        <For each={props.node.spans}>
          {(span, index) => (
            <SpanEditor
              span={span}
              onChange={(patch) => props.actions.patchSpan(key(), index(), patch)}
              onRemove={() => props.actions.removeSpan(key(), index())}
            />
          )}
        </For>
      </div>

      <div class="flex flex-wrap gap-1">
        <AddItem kind="ingredient" {...props} />
        <AddItem kind="tool" {...props} />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => props.actions.addSpan(key(), { kind: "active", seconds: 300 })}
        >
          <IconClock aria-hidden="true" />
          Timer
        </Button>
      </div>

      <Show when={repeatOpen()}>
        <div class="flex items-center gap-3">
          <span class="inline-flex items-center gap-1.5 text-sm font-medium">
            <IconRepeat size={18} aria-hidden="true" />
            Times
          </span>
          <Stepper
            label="repeats"
            value={props.node.repeatMin}
            onChange={(value) => {
              props.actions.setStep(key(), "repeatMin", value);
              props.actions.setStep(key(), "repeatMax", Math.max(value, props.node.repeatMax));
            }}
          />
        </div>
      </Show>

      <Show when={noteOpen()}>
        <MarkdownEditor
          label={`Step ${props.number} note`}
          placeholder="Optional. Only what the items and timers do not say."
          defaultValue={props.node.body}
          onChange={(value) => props.actions.setStep(key(), "body", value)}
        />
      </Show>
    </article>
  );
}

function AddItem(props: {
  kind: CatalogKind;
  node: DraftNode;
  draft: RecipeDraft;
  actions: DraftActions;
  catalog: Catalog;
}) {
  const [open, setOpen] = createSignal(false);
  const used = () =>
    props.kind === "ingredient"
      ? props.node.ingredients.map((item) => item.ingredientId)
      : props.node.tools.map((item) => item.toolId);
  return (
    <Popover open={open()} onOpenChange={setOpen}>
      <PopoverTrigger as={Button} variant="ghost" size="sm" class={cn("gap-1")}>
        <IconPlus aria-hidden="true" />
        <Dynamic
          component={props.kind === "ingredient" ? IconCarrot : IconToolsKitchen2}
          aria-hidden="true"
        />
        {props.kind === "ingredient" ? "Ingredient" : "Tool"}
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent>
          <ItemPicker
            kind={props.kind}
            catalog={props.catalog}
            autofocus
            picked={
              props.kind === "ingredient"
                ? props.draft.pantry.ingredients
                : props.draft.pantry.tools
            }
            exclude={used()}
            onPick={(id) => {
              if (props.kind === "ingredient") props.actions.addIngredient(props.node.key, id);
              else props.actions.addTool(props.node.key, id);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
}
