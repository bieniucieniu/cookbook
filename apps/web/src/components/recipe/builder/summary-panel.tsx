import {
  IconAlertTriangle,
  IconArrowsShuffle,
  IconCarrot,
  IconClock,
  IconGitBranch,
  IconLayoutList,
  IconPlus,
  IconSettings,
  IconToolsKitchen2,
  IconUsers,
} from "@/components/icons";
import { Button } from "@/components/m3/button";
import type { Catalog } from "@/lib/catalog";
import { roughSeconds, stepSeconds, type RecipeDraft } from "@/lib/recipe-draft";
import { lanes } from "@/lib/recipe-graph";
import type { RecipeSummary, SummaryLine } from "@/lib/recipe-summary";
import { formatAmount, formatDuration } from "@/lib/units";
import { cn } from "@/lib/utils";
import { createMemo, For, Index, Show } from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
import { MarkdownEditor } from "../markdown";
import { IconLabel } from "../parts";
import type { DraftActions } from "./actions";
import { AddButton } from "./step-editor";
import type { Warning } from "./warnings";

/**
 * The whole recipe at a glance: name, intro, everything it uses (summed from the steps), and the
 * steps in order. Each step adds the next one, an alternative, or one to do alongside.
 */
export function SummaryPanel(props: {
  draft: RecipeDraft;
  setDraft: SetStoreFunction<RecipeDraft>;
  actions: DraftActions;
  catalog: Catalog;
  summary: RecipeSummary;
  warnings: Warning[];
  numbers: Map<string, number>;
  selected: string | undefined;
  onSelect: (selection: string) => void;
  onFix: (warning: Warning) => void;
}) {
  const rows = createMemo(() => lanes(props.draft.nodes, props.draft.edges));
  const rowMode = (row: { key: string }[]) => {
    const parent = props.draft.edges.find((edge) => edge.to === row[0]?.key)?.from;
    return props.draft.nodes.find((node) => node.key === parent)?.branchMode === "xor"
      ? "xor"
      : "and";
  };
  const titleOf = (key: string) =>
    props.draft.nodes.find((node) => node.key === key)?.title.trim() ||
    `Step ${props.numbers.get(key) ?? ""}`;
  const add = (relation: "next" | "alt" | "parallel", anchor?: string) => {
    const key = props.actions.addStep(relation, anchor);
    if (key) props.onSelect(key);
  };

  return (
    <div class="flex flex-col gap-6">
      <section class="flex flex-col gap-2" aria-label="Recipe">
        <input
          id="recipe-title"
          class="w-full rounded-small bg-transparent px-1 py-1 typescale-headline-medium text-on-surface outline-none placeholder:text-on-surface-variant focus-ring"
          aria-label="Recipe name"
          placeholder="Recipe name, e.g. Tomato eggs"
          value={props.draft.title}
          onInput={(event) => props.setDraft("title", event.currentTarget.value)}
        />
        <MarkdownEditor
          label="About this recipe"
          placeholder="A line or two about the dish."
          defaultValue={props.draft.description}
          onChange={(value) => props.setDraft("description", value)}
        />
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 typescale-label-large text-on-surface-variant">
          <IconLabel
            icon={IconUsers}
            label={`${props.draft.cooks} ${props.draft.cooks === 1 ? "cook" : "cooks"}`}
          />
          <IconLabel
            icon={IconClock}
            label={`about ${formatDuration(roughSeconds(props.draft))}`}
          />
          <IconLabel
            icon={IconLayoutList}
            label={`${props.draft.nodes.length} ${props.draft.nodes.length === 1 ? "step" : "steps"}`}
          />
          <Button
            variant={props.selected === "details" ? "tonal" : "text"}
            size="sm"
            aria-current={props.selected === "details" ? "page" : undefined}
            onClick={() => props.onSelect("details")}
          >
            <IconSettings aria-hidden="true" />
            Details
          </Button>
        </div>
      </section>

      <ItemList
        title="Ingredients"
        icon={IconCarrot}
        lines={props.summary.ingredients}
        catalog={props.catalog}
        titleOf={titleOf}
        onSelect={props.onSelect}
        empty="Add ingredients to a step. They add up here."
      />
      <ItemList
        title="Tools"
        icon={IconToolsKitchen2}
        lines={props.summary.tools}
        catalog={props.catalog}
        titleOf={titleOf}
        onSelect={props.onSelect}
        empty="Add tools to a step."
      />

      <section class="flex flex-col gap-2" aria-label="Steps">
        <h2 class="typescale-title-medium text-on-surface">
          <IconLabel icon={IconLayoutList} label="Steps" />
        </h2>
        <ol class="flex flex-col gap-2">
          <Index each={rows()}>
            {(row) => (
              <li
                class={cn(
                  "flex flex-col gap-1.5",
                  row().length > 1 && "border-l-2 border-outline-variant pl-2"
                )}
              >
                <Show when={row().length > 1}>
                  <span class="inline-flex items-center gap-1.5 px-1 typescale-label-medium text-on-surface-variant">
                    <Show
                      when={rowMode(row()) === "xor"}
                      fallback={
                        <>
                          <IconGitBranch size={14} aria-hidden="true" />
                          At the same time
                        </>
                      }
                    >
                      <IconArrowsShuffle size={14} aria-hidden="true" />
                      Pick one
                    </Show>
                  </span>
                </Show>
                <ol class="flex flex-col gap-1.5">
                  <For each={row()}>
                    {(node) => (
                      <li
                        class={cn(
                          "flex flex-col gap-1.5 rounded-medium p-2 motion-fast",
                          props.selected === node.key
                            ? "bg-secondary-container text-on-secondary-container"
                            : "text-on-surface"
                        )}
                      >
                        <button
                          type="button"
                          class="flex items-center gap-2 rounded-small text-left focus-ring"
                          aria-current={props.selected === node.key ? "step" : undefined}
                          onClick={() => props.onSelect(node.key)}
                        >
                          <span
                            class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary typescale-label-medium text-on-primary tabular-nums"
                            aria-hidden="true"
                          >
                            {props.numbers.get(node.key)}
                          </span>
                          <span
                            class={cn(
                              "min-w-0 flex-1 truncate typescale-title-small",
                              !node.title.trim() && "opacity-70"
                            )}
                          >
                            {node.title.trim() || "Unnamed step"}
                          </span>
                          <Show when={stepSeconds(node) > 0}>
                            <span class="typescale-label-medium tabular-nums opacity-80">
                              {formatDuration(stepSeconds(node))}
                            </span>
                          </Show>
                        </button>
                        <div class="flex flex-wrap gap-1 pl-9">
                          <AddButton
                            relation="next"
                            anchor={node.key}
                            actions={props.actions}
                            onAdd={(relation) => add(relation, node.key)}
                            size="xs"
                          />
                          <AddButton
                            relation="alt"
                            anchor={node.key}
                            actions={props.actions}
                            onAdd={(relation) => add(relation, node.key)}
                            size="xs"
                          />
                          <AddButton
                            relation="parallel"
                            anchor={node.key}
                            actions={props.actions}
                            onAdd={(relation) => add(relation, node.key)}
                            size="xs"
                          />
                        </div>
                      </li>
                    )}
                  </For>
                </ol>
              </li>
            )}
          </Index>
        </ol>
        <Button variant="tonal" class="w-fit" onClick={() => add("next")}>
          <IconPlus aria-hidden="true" />
          {props.draft.nodes.length === 0 ? "Add the first step" : "Add a step at the end"}
        </Button>
      </section>

      <Show when={props.warnings.length > 0}>
        <section class="flex flex-col gap-1" aria-label="To fix">
          <h2 class="typescale-title-small text-on-surface">To fix before saving</h2>
          <ul class="flex flex-col">
            <For each={props.warnings}>
              {(warning) => (
                <li>
                  <button
                    type="button"
                    class="relative flex w-full items-start gap-2 rounded-small px-2 py-1.5 text-left typescale-body-medium text-on-surface-variant state-layer focus-ring"
                    classList={{ "text-error": warning.blocking }}
                    onClick={() => props.onFix(warning)}
                  >
                    <IconAlertTriangle size={16} aria-hidden="true" class="mt-0.5 shrink-0" />
                    <span class="flex-1">{warning.text}</span>
                  </button>
                </li>
              )}
            </For>
          </ul>
        </section>
      </Show>
    </div>
  );
}

function amountText(line: SummaryLine): string {
  return line.amounts
    .map((amount) => formatAmount(amount.qty, amount.unit))
    .filter(Boolean)
    .join(" + ");
}

function ItemList(props: {
  title: string;
  icon: typeof IconCarrot;
  lines: SummaryLine[];
  catalog: Catalog;
  titleOf: (key: string) => string;
  onSelect: (key: string) => void;
  empty: string;
}) {
  return (
    <section class="flex flex-col gap-2" aria-label={props.title}>
      <h2 class="typescale-title-medium text-on-surface">
        <IconLabel icon={props.icon} label={props.title} />
      </h2>
      <ul class="flex flex-col gap-1">
        <For
          each={props.lines}
          fallback={<li class="typescale-body-medium text-on-surface-variant">{props.empty}</li>}
        >
          {(line) => (
            <li
              class={cn(
                "flex flex-col gap-0.5 rounded-small px-2 py-1 typescale-body-medium text-on-surface",
                line.conflict && "bg-error-container text-on-error-container"
              )}
            >
              <div class="flex flex-wrap items-baseline gap-x-2">
                <Show when={amountText(line)}>
                  <span class="font-semibold tabular-nums">{amountText(line)}</span>
                </Show>
                <span class="font-medium">{props.catalog.name(line.kind, line.id)}</span>
                <Show when={line.optional && !line.conflict}>
                  <span class="typescale-body-small text-on-surface-variant">optional</span>
                </Show>
                <Show when={line.onlyInAlternative}>
                  <span class="typescale-body-small text-on-surface-variant">in one option</span>
                </Show>
              </div>
              <Show when={line.alts.length > 0}>
                <span class="typescale-body-small text-on-surface-variant">
                  or{" "}
                  {line.alts
                    .map((alt) => {
                      const name = props.catalog.name(line.kind, alt.id);
                      const all = alt.stepKeys.length === line.stepKeys.length;
                      return all
                        ? name
                        : `${name} (in ${alt.stepKeys.map(props.titleOf).join(", ")})`;
                    })
                    .join(", ")}
                </span>
              </Show>
              <Show when={line.conflict}>
                <span class="typescale-body-small" role="alert">
                  Optional in{" "}
                  <StepLinks
                    keys={line.optionalSteps}
                    titleOf={props.titleOf}
                    onSelect={props.onSelect}
                  />
                  , required in{" "}
                  <StepLinks
                    keys={line.requiredSteps}
                    titleOf={props.titleOf}
                    onSelect={props.onSelect}
                  />
                  . Make it the same everywhere.
                </span>
              </Show>
            </li>
          )}
        </For>
      </ul>
    </section>
  );
}

function StepLinks(props: {
  keys: string[];
  titleOf: (key: string) => string;
  onSelect: (key: string) => void;
}) {
  return (
    <For each={props.keys}>
      {(key, index) => (
        <>
          <Show when={index() > 0}>, </Show>
          <button type="button" class="underline" onClick={() => props.onSelect(key)}>
            {props.titleOf(key)}
          </button>
        </>
      )}
    </For>
  );
}
