import { IconCarrot, IconClock, IconPlus, IconToolsKitchen2, IconX } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import type { SpanWrite } from "@/generated/model";
import type { Catalog, CatalogKind } from "@/lib/catalog";
import type { RecipeDraft } from "@/lib/recipe-draft";
import { durationPresets, formatDuration } from "@/lib/units";
import { createSignal, For, Match, Show, Switch } from "solid-js";
import { ItemPicker } from "../item-picker";
import { ItemChip, SpanBadge } from "../parts";
import type { DraftActions } from "./actions";

type Picker = CatalogKind | "timer";

/** Cooklang-style triggers: @ ingredient, # tool, ~ timer. */
const triggers: Record<string, Picker> = { "@": "ingredient", "#": "tool", "~": "timer" };

/**
 * Pinned at the bottom like a chat composer. Type a short step name, tap or type a trigger to
 * attach items and a timer, press Enter. The step lands at the end, wired after open arms.
 */
export function StepComposer(props: {
  draft: RecipeDraft;
  actions: DraftActions;
  catalog: Catalog;
  onAdded: (key: string) => void;
}) {
  let input: HTMLInputElement | undefined;
  const [title, setTitle] = createSignal("");
  const [picker, setPicker] = createSignal<Picker>();
  const [ingredients, setIngredients] = createSignal<number[]>([]);
  const [tools, setTools] = createSignal<number[]>([]);
  const [spans, setSpans] = createSignal<Omit<SpanWrite, "ord">[]>([]);
  const [error, setError] = createSignal(false);

  const focus = () => queueMicrotask(() => input?.focus());
  const close = () => {
    setPicker(undefined);
    focus();
  };

  const submit = () => {
    const name = title().trim();
    if (!name) {
      setError(true);
      focus();
      return;
    }
    const key = props.actions.addStep({
      title: name,
      ingredients: ingredients().map((ingredientId) => ({
        ingredientId,
        qty: null,
        unit: null,
        optional: false,
      })),
      tools: tools().map((toolId) => ({ toolId, optional: false, hold: "active" as const })),
      spans: spans().map((span, ord) => ({ ...span, ord })),
    });
    for (const id of ingredients()) props.actions.pantryAdd("ingredient", id);
    for (const id of tools()) props.actions.pantryAdd("tool", id);
    setTitle("");
    setIngredients([]);
    setTools([]);
    setSpans([]);
    setPicker(undefined);
    setError(false);
    props.onAdded(key);
    focus();
  };

  return (
    <form
      class="flex flex-col gap-2 rounded-xl border border-border bg-popover p-2 shadow-lg"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Show when={ingredients().length + tools().length + spans().length > 0}>
        <ul class="flex flex-wrap gap-1.5" aria-label="Attached to the new step">
          <For each={ingredients()}>
            {(id) => (
              <li>
                <ItemChip
                  kind="ingredient"
                  name={props.catalog.name("ingredient", id)}
                  aria-label={`Remove ${props.catalog.name("ingredient", id)}`}
                  onClick={() => setIngredients((ids) => ids.filter((item) => item !== id))}
                />
              </li>
            )}
          </For>
          <For each={tools()}>
            {(id) => (
              <li>
                <ItemChip
                  kind="tool"
                  name={props.catalog.name("tool", id)}
                  aria-label={`Remove ${props.catalog.name("tool", id)}`}
                  onClick={() => setTools((ids) => ids.filter((item) => item !== id))}
                />
              </li>
            )}
          </For>
          <For each={spans()}>
            {(span, index) => (
              <li>
                <SpanBadge
                  kind={span.kind}
                  seconds={span.seconds}
                  aria-label={`Remove timer ${formatDuration(span.seconds)}`}
                  onClick={() => setSpans((list) => list.filter((_, at) => at !== index()))}
                />
              </li>
            )}
          </For>
        </ul>
      </Show>

      <Switch>
        <Match when={picker() === "ingredient" || picker() === "tool"}>
          <div class="flex items-start gap-1">
            <div class="flex-1">
              <ItemPicker
                kind={picker() === "tool" ? "tool" : "ingredient"}
                catalog={props.catalog}
                autofocus
                picked={
                  picker() === "tool" ? props.draft.pantry.tools : props.draft.pantry.ingredients
                }
                exclude={picker() === "tool" ? tools() : ingredients()}
                onPick={(id) => {
                  if (picker() === "tool") setTools((ids) => [...ids, id]);
                  else setIngredients((ids) => [...ids, id]);
                  close();
                }}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label="Close picker"
              onClick={close}
            >
              <IconX aria-hidden="true" />
            </Button>
          </div>
        </Match>
        <Match when={picker() === "timer"}>
          <div class="flex flex-wrap items-center gap-1" role="group" aria-label="Timer length">
            <For each={durationPresets.slice(1, 9)}>
              {(seconds) => (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="tabular-nums"
                  onClick={() => {
                    setSpans((list) => [...list, { kind: "active", seconds }]);
                    close();
                  }}
                >
                  {formatDuration(seconds)}
                </Button>
              )}
            </For>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Close timer"
              onClick={close}
            >
              <IconX aria-hidden="true" />
            </Button>
          </div>
        </Match>
      </Switch>

      <div class="flex items-center gap-2">
        <input
          ref={(element) => (input = element)}
          class="h-10 min-w-0 flex-1 rounded-md bg-transparent px-2 text-base outline-none placeholder:text-muted-foreground aria-invalid:ring-2 aria-invalid:ring-destructive/40"
          placeholder="Next step, e.g. Chop"
          aria-label="New step name"
          aria-invalid={error() ? "true" : undefined}
          value={title()}
          onInput={(event) => {
            const value = event.currentTarget.value;
            const last = value.slice(-1);
            const kind = triggers[last];
            if (kind) {
              const stripped = value.slice(0, -1);
              event.currentTarget.value = stripped;
              setTitle(stripped);
              setPicker(kind);
              return;
            }
            setTitle(value);
            if (value.trim()) setError(false);
          }}
        />
        <Button type="submit" size="icon-lg" aria-label="Add step">
          <IconPlus aria-hidden="true" />
        </Button>
      </div>
      <Show when={error()}>
        <p class="px-2 text-sm text-destructive" role="alert">
          Give the step a short name first.
        </p>
      </Show>

      <div class="flex flex-wrap items-center gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={() => setPicker("ingredient")}>
          <IconCarrot aria-hidden="true" />
          Ingredient
          <Kbd>@</Kbd>
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setPicker("tool")}>
          <IconToolsKitchen2 aria-hidden="true" />
          Tool
          <Kbd>#</Kbd>
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setPicker("timer")}>
          <IconClock aria-hidden="true" />
          Timer
          <Kbd>~</Kbd>
        </Button>
      </div>
    </form>
  );
}
