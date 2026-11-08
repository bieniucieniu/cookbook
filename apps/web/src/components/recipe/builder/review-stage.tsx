import { photoUrl } from "@/lib/api";
import {
  IconAlertTriangle,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconUsers,
} from "@/components/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Catalog } from "@/lib/catalog";
import { roughSeconds, rollup, toolIds, type RecipeDraft } from "@/lib/recipe-draft";
import { formatDuration } from "@/lib/units";
import { For, Show } from "solid-js";
import { IconLabel, ItemChip } from "../parts";
import type { StageId, Warning } from "./stages";

export function ReviewStage(props: {
  draft: RecipeDraft;
  catalog: Catalog;
  warnings: Warning[];
  error?: string;
  onFix: (stage: StageId, nodeKey?: string) => void;
}) {
  const lines = () => rollup(props.draft);
  return (
    <div class="flex flex-col gap-6">
      <Show when={props.error}>
        <Alert variant="destructive">
          <AlertTitle>Could not save</AlertTitle>
          <AlertDescription>{props.error}</AlertDescription>
        </Alert>
      </Show>
      <section class="flex flex-col gap-2" aria-label="To fix">
        <Show
          when={props.warnings.length > 0}
          fallback={
            <IconLabel icon={IconCheck} label="Ready to save" class="text-base font-semibold" />
          }
        >
          <ul class="flex flex-col gap-1">
            <For each={props.warnings}>
              {(warning) => (
                <li>
                  <button
                    type="button"
                    class="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                    classList={{ "text-destructive": warning.blocking }}
                    onClick={() => props.onFix(warning.stage, warning.nodeKey)}
                  >
                    <IconAlertTriangle size={18} aria-hidden="true" class="shrink-0" />
                    <span class="flex-1">{warning.text}</span>
                    <span class="text-xs font-medium">Fix</span>
                    <IconChevronRight size={16} aria-hidden="true" />
                  </button>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </section>

      <section class="flex flex-col gap-3">
        <Show when={props.draft.photos[0]}>
          {(photo) => (
            <img
              src={photoUrl(photo().id)}
              alt={photo().alt}
              class="aspect-video w-full rounded-xl object-cover"
            />
          )}
        </Show>
        <h2 class="text-xl font-bold">{props.draft.title || "Untitled"}</h2>
        <div class="flex flex-wrap gap-4 text-sm">
          <IconLabel
            icon={IconUsers}
            label={`${props.draft.cooks} ${props.draft.cooks === 1 ? "cook" : "cooks"}`}
          />
          <IconLabel
            icon={IconClock}
            label={`about ${formatDuration(roughSeconds(props.draft))}`}
          />
          <span>{props.draft.nodes.length} steps</span>
        </div>
        <ul class="flex flex-wrap gap-2" aria-label="Ingredients">
          <For each={lines()}>
            {(line) => (
              <li>
                <ItemChip
                  kind="ingredient"
                  name={props.catalog.name("ingredient", line.ingredientId)}
                  qty={line.qty}
                  unit={line.unit}
                  optional={line.optional}
                  static
                />
              </li>
            )}
          </For>
        </ul>
        <ul class="flex flex-wrap gap-2" aria-label="Tools">
          <For each={toolIds(props.draft)}>
            {(id) => (
              <li>
                <ItemChip kind="tool" name={props.catalog.name("tool", id)} static />
              </li>
            )}
          </For>
        </ul>
      </section>
    </div>
  );
}
