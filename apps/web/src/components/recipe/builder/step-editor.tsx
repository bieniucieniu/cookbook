import {
  IconArrowDown,
  IconArrowsShuffle,
  IconCarrot,
  IconClock,
  IconCopy,
  IconGitBranch,
  IconHourglass,
  IconNote,
  IconPlus,
  IconRepeat,
  IconToolsKitchen2,
  IconTrash,
} from "@/components/icons";
import { Button } from "@/components/m3/button";
import { IconButton } from "@/components/m3/icon-button";
import {
  TextField,
  TextFieldContainer,
  TextFieldInput,
  TextFieldLabel,
} from "@/components/m3/text-field";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/popover";
import { SelectField } from "@/components/select-field";
import type { Catalog, CatalogKind } from "@/lib/catalog";
import type { DraftNode, RecipeDraft } from "@/lib/recipe-draft";
import {
  currentPlacement,
  detachEdges,
  placement,
  relationLabel,
  type Relation,
} from "@/lib/recipe-graph";
import { createMemo, createSignal, For, type JSX, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { IngredientEditor, RemoveButton, SpanEditor, ToolEditor } from "../editors";
import { ItemPicker } from "../item-picker";
import { MarkdownEditor } from "../markdown";
import { IconLabel, ItemChip, Stepper } from "../parts";
import type { DraftActions } from "./actions";

const relations: Relation[] = ["next", "alt", "parallel"];

/** One step, full size: where it goes, what it uses, how long it takes. */
export function StepEditor(props: {
  stepKey: string;
  number: number;
  draft: RecipeDraft;
  actions: DraftActions;
  catalog: Catalog;
  onSelect: (key: string) => void;
}) {
  const node = createMemo(() => props.draft.nodes.find((item) => item.key === props.stepKey));
  const [noteOpen, setNoteOpen] = createSignal(Boolean(node()?.body.trim()));
  const key = () => props.stepKey;
  const titleOf = (other: string) => {
    const index = props.draft.nodes.findIndex((item) => item.key === other);
    return props.draft.nodes[index]?.title.trim() || `Step ${index + 1}`;
  };

  const add = (relation: Relation) => {
    const added = props.actions.addStep(relation, key());
    if (added) props.onSelect(added);
  };

  return (
    <Show when={node()}>
      {(step) => (
        <article
          id={`step-${step().key}`}
          // Scrolled into view under the sticky app bar and editor toolbar.
          class="flex scroll-mt-[calc(var(--app-bar-height)+5rem)] flex-col gap-6"
          aria-label={`Step ${props.number}`}
        >
          <header class="flex items-center gap-2">
            <span
              class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary typescale-label-large text-on-primary tabular-nums"
              aria-hidden="true"
            >
              {props.number}
            </span>
            <input
              ref={(element) => {
                // A new step opens ready to be named.
                if (!step().title.trim()) queueMicrotask(() => element.focus());
              }}
              class="min-w-0 flex-1 rounded-small bg-transparent px-1 py-1 typescale-headline-small text-on-surface outline-none placeholder:text-on-surface-variant focus-ring"
              aria-label={`Step ${props.number} name`}
              placeholder="Name this step, e.g. Chop"
              value={step().title}
              onInput={(event) => props.actions.setStep(key(), "title", event.currentTarget.value)}
            />
            <IconButton
              aria-label="Duplicate step"
              title="Duplicate"
              onClick={() => {
                const copy = props.actions.duplicateStep(key());
                if (copy) props.onSelect(copy);
              }}
            >
              <IconCopy aria-hidden="true" />
            </IconButton>
            <IconButton
              aria-label="Delete step"
              title="Delete"
              onClick={() => props.actions.removeStep(key())}
            >
              <IconTrash aria-hidden="true" />
            </IconButton>
          </header>

          <PlacementRow
            node={step()}
            draft={props.draft}
            actions={props.actions}
            titleOf={titleOf}
          />

          <Section icon={IconCarrot} label="Ingredients">
            <ul class="flex flex-col gap-2">
              <For each={step().ingredients}>
                {(item) => (
                  <ItemRow
                    kind="ingredient"
                    alts={(item.alts ?? []).map((alt) => alt.altIngredientId)}
                    catalog={props.catalog}
                    exclude={[item.ingredientId]}
                    onAddAlt={(alt) =>
                      props.actions.addIngredientAlt(key(), item.ingredientId, alt)
                    }
                    onRemoveAlt={(alt) =>
                      props.actions.removeIngredientAlt(key(), item.ingredientId, alt)
                    }
                    altDetail={(alt) => {
                      const swap = () =>
                        (item.alts ?? []).find((entry) => entry.altIngredientId === alt);
                      return (
                        <TextField
                          variant="outlined"
                          value={String(swap()?.ratio ?? 1)}
                          onChange={(value) => {
                            const ratio = Number(value.replace(",", "."));
                            if (Number.isFinite(ratio) && ratio > 0)
                              props.actions.patchIngredientAlt(key(), item.ingredientId, alt, {
                                ratio,
                              });
                          }}
                        >
                          <TextFieldContainer>
                            <TextFieldLabel>Amount × (1 = same amount)</TextFieldLabel>
                            <TextFieldInput inputMode="decimal" class="tabular-nums" />
                          </TextFieldContainer>
                        </TextField>
                      );
                    }}
                  >
                    <IngredientEditor
                      name={props.catalog.name("ingredient", item.ingredientId)}
                      item={item}
                      onChange={(patch) => {
                        const { optional, ...rest } = patch;
                        if (optional !== undefined)
                          props.actions.setIngredientOptional(item.ingredientId, optional);
                        if (Object.keys(rest).length > 0)
                          props.actions.patchIngredient(key(), item.ingredientId, rest);
                      }}
                      onRemove={() => props.actions.removeIngredient(key(), item.ingredientId)}
                    />
                  </ItemRow>
                )}
              </For>
            </ul>
            <ItemPicker
              kind="ingredient"
              catalog={props.catalog}
              label="Add ingredient"
              placeholder="Add an ingredient…"
              picked={usedIds(props.draft, "ingredient")}
              exclude={step().ingredients.map((item) => item.ingredientId)}
              onPick={(id) => props.actions.addIngredient(key(), id)}
            />
          </Section>

          <Section icon={IconToolsKitchen2} label="Tools">
            <ul class="flex flex-col gap-2">
              <For each={step().tools}>
                {(item) => (
                  <ItemRow
                    kind="tool"
                    alts={(item.alts ?? []).map((alt) => alt.altToolId)}
                    catalog={props.catalog}
                    exclude={[item.toolId]}
                    onAddAlt={(alt) => props.actions.addToolAlt(key(), item.toolId, alt)}
                    onRemoveAlt={(alt) => props.actions.removeToolAlt(key(), item.toolId, alt)}
                  >
                    <ToolEditor
                      name={props.catalog.name("tool", item.toolId)}
                      item={item}
                      onChange={(patch) => {
                        const { optional, ...rest } = patch;
                        if (optional !== undefined)
                          props.actions.setToolOptional(item.toolId, optional);
                        if (Object.keys(rest).length > 0)
                          props.actions.patchTool(key(), item.toolId, rest);
                      }}
                      onRemove={() => props.actions.removeTool(key(), item.toolId)}
                    />
                  </ItemRow>
                )}
              </For>
            </ul>
            <ItemPicker
              kind="tool"
              catalog={props.catalog}
              label="Add tool"
              placeholder="Add a tool…"
              picked={usedIds(props.draft, "tool")}
              exclude={step().tools.map((item) => item.toolId)}
              onPick={(id) => props.actions.addTool(key(), id)}
            />
          </Section>

          <Section icon={IconClock} label="Time">
            <div class="flex flex-wrap items-center gap-2">
              <For each={step().spans}>
                {(span, index) => (
                  <SpanEditor
                    span={span}
                    onChange={(patch) => props.actions.patchSpan(key(), index(), patch)}
                    onRemove={() => props.actions.removeSpan(key(), index())}
                  />
                )}
              </For>
              <Button
                variant="outlined"
                size="sm"
                onClick={() => props.actions.addSpan(key(), { kind: "active", seconds: 300 })}
              >
                <IconPlus aria-hidden="true" />
                Hands on
              </Button>
              <Button
                variant="outlined"
                size="sm"
                onClick={() => props.actions.addSpan(key(), { kind: "wait", seconds: 600 })}
              >
                <IconHourglass aria-hidden="true" />
                Wait
              </Button>
            </div>
            <div class="flex items-center gap-3">
              <IconLabel
                icon={IconRepeat}
                label="Times"
                class="typescale-label-large text-on-surface-variant"
              />
              <Stepper
                label="repeats"
                value={step().repeatMin}
                onChange={(value) => {
                  props.actions.setStep(key(), "repeatMin", value);
                  props.actions.setStep(key(), "repeatMax", Math.max(value, step().repeatMax));
                }}
              />
            </div>
          </Section>

          <Show
            when={noteOpen()}
            fallback={
              <Button variant="text" class="w-fit" onClick={() => setNoteOpen(true)}>
                <IconNote aria-hidden="true" />
                Add a note
              </Button>
            }
          >
            <Section icon={IconNote} label="Note">
              <MarkdownEditor
                label={`Step ${props.number} note`}
                placeholder="Optional. Only what the items and timers do not say."
                defaultValue={step().body}
                onChange={(value) => props.actions.setStep(key(), "body", value)}
              />
            </Section>
          </Show>

          <footer class="flex flex-wrap gap-2 border-t border-outline-variant pt-4">
            <AddButton relation="next" anchor={key()} actions={props.actions} onAdd={add} />
            <AddButton relation="alt" anchor={key()} actions={props.actions} onAdd={add} />
            <AddButton relation="parallel" anchor={key()} actions={props.actions} onAdd={add} />
          </footer>
        </article>
      )}
    </Show>
  );
}

function usedIds(draft: RecipeDraft, kind: CatalogKind): number[] {
  return [
    ...new Set(
      draft.nodes.flatMap((node) =>
        kind === "ingredient"
          ? node.ingredients.map((item) => item.ingredientId)
          : node.tools.map((item) => item.toolId)
      )
    ),
  ];
}

function Section(props: { icon: typeof IconCarrot; label: string; children: JSX.Element }) {
  return (
    <section class="flex flex-col gap-3">
      <h3 class="typescale-title-medium text-on-surface">
        <IconLabel icon={props.icon} label={props.label} />
      </h3>
      {props.children}
    </section>
  );
}

/** Where the step sits. Changing it rewires the step; the graph is never needed. */
function PlacementRow(props: {
  node: DraftNode;
  draft: RecipeDraft;
  actions: DraftActions;
  titleOf: (key: string) => string;
}) {
  const current = createMemo(() =>
    currentPlacement(props.node.key, props.draft.nodes, props.draft.edges)
  );
  const others = createMemo(() => props.draft.nodes.filter((item) => item.key !== props.node.key));
  const detached = createMemo(() =>
    detachEdges(
      props.node.key,
      props.draft.edges.map((edge) => ({ from: edge.from, to: edge.to }))
    )
  );
  const check = (relation: Relation, anchor: string) =>
    placement(anchor, relation, others(), detached());
  const move = (relation: Relation, anchor: string | undefined) => {
    if (anchor === undefined) {
      if (relation === "next") props.actions.place(props.node.key, "next", undefined);
      return;
    }
    if (check(relation, anchor).ok) props.actions.place(props.node.key, relation, anchor);
  };

  return (
    <section
      class="flex flex-col gap-4 border-t border-outline-variant pt-4"
      aria-label="Placement"
    >
      <span class="typescale-label-large text-on-surface-variant">Placement</span>
      <Show
        when={props.actions.movable(props.node.key)}
        fallback={
          <p class="typescale-body-medium text-on-surface-variant">
            Arms split or meet at this step. Move the steps around it, or use the flow.
          </p>
        }
      >
        <div class="flex flex-wrap items-center gap-3">
          <SelectField
            label="How this step runs"
            containerClass="w-44"
            value={current().relation}
            onChange={(event) => {
              const relation = event.currentTarget.value;
              if (relation !== "next" && relation !== "alt" && relation !== "parallel") return;
              const anchor =
                current().anchor ??
                others().find((item) => check(relation, item.key).ok)?.key ??
                others().at(-1)?.key;
              move(relation, anchor);
              event.currentTarget.value = current().relation;
            }}
          >
            <For each={relations}>
              {(relation) => <option value={relation}>{relationLabel[relation]}</option>}
            </For>
          </SelectField>
          <SelectField
            label="Relative to step"
            containerClass="min-w-48 flex-1"
            value={current().anchor ?? ""}
            onChange={(event) => {
              const anchor = event.currentTarget.value;
              move(current().relation, anchor === "" ? undefined : anchor);
              event.currentTarget.value = current().anchor ?? "";
            }}
          >
            <Show when={current().relation === "next"}>
              <option value="">Start (or after open arms)</option>
            </Show>
            <For each={others()}>
              {(item) => (
                <option value={item.key} disabled={!check(current().relation, item.key).ok}>
                  {props.titleOf(item.key)}
                </option>
              )}
            </For>
          </SelectField>
        </div>
      </Show>
    </section>
  );
}

const relationIcon: Record<Relation, typeof IconArrowDown> = {
  next: IconArrowDown,
  alt: IconArrowsShuffle,
  parallel: IconGitBranch,
};

const relationButton: Record<Relation, string> = {
  next: "Next",
  alt: "Or",
  parallel: "Alongside",
};

const relationHint: Record<Relation, string> = {
  next: "Add a step after this one",
  alt: "Add a step to do instead of this one",
  parallel: "Add a step to do at the same time",
};

/** Adds a step at `relation` to `anchor`. Disabled, with the reason, when it cannot fit. */
export function AddButton(props: {
  relation: Relation;
  anchor: string;
  actions: DraftActions;
  onAdd: (relation: Relation) => void;
  size?: "sm" | "xs";
}) {
  const check = () => props.actions.canPlace(props.anchor, props.relation);
  const reason = () => {
    const result = check();
    return result.ok ? relationHint[props.relation] : result.reason;
  };
  return (
    <span title={reason()}>
      <Button
        variant="outlined"
        size={props.size ?? "sm"}
        disabled={!check().ok}
        aria-label={`${relationButton[props.relation]}: ${reason()}`}
        onClick={() => props.onAdd(props.relation)}
      >
        <Dynamic component={relationIcon[props.relation]} aria-hidden="true" />
        {relationButton[props.relation]}
      </Button>
    </span>
  );
}

/** An item the step uses, with the swaps this step accepts. */
function ItemRow(props: {
  kind: CatalogKind;
  alts: number[];
  catalog: Catalog;
  exclude: number[];
  onAddAlt: (id: number) => void;
  onRemoveAlt: (id: number) => void;
  altDetail?: (id: number) => JSX.Element;
  children: JSX.Element;
}) {
  const [open, setOpen] = createSignal(false);
  return (
    <li class="flex flex-wrap items-center gap-2">
      {props.children}
      <For each={props.alts}>
        {(alt) => (
          <span class="inline-flex items-center gap-1">
            <span class="typescale-label-medium text-on-surface-variant">or</span>
            <Popover>
              <PopoverTrigger
                as={ItemChip}
                kind={props.kind}
                name={props.catalog.name(props.kind, alt)}
                aria-label={`Edit swap ${props.catalog.name(props.kind, alt)}`}
              />
              <PopoverPortal>
                <PopoverContent>
                  <PopoverTitle>Swap: {props.catalog.name(props.kind, alt)}</PopoverTitle>
                  {props.altDetail?.(alt)}
                  <RemoveButton label="Remove swap" onClick={() => props.onRemoveAlt(alt)} />
                </PopoverContent>
              </PopoverPortal>
            </Popover>
          </span>
        )}
      </For>
      <Popover open={open()} onOpenChange={setOpen}>
        <PopoverTrigger as={Button} variant="text" size="sm">
          <IconArrowsShuffle aria-hidden="true" />
          Swap
        </PopoverTrigger>
        <PopoverPortal>
          <PopoverContent>
            <ItemPicker
              kind={props.kind}
              catalog={props.catalog}
              autofocus
              label="Or use"
              placeholder="Or use…"
              exclude={[...props.exclude, ...props.alts]}
              onPick={(id) => {
                props.onAddAlt(id);
                setOpen(false);
              }}
            />
          </PopoverContent>
        </PopoverPortal>
      </Popover>
    </li>
  );
}
