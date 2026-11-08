import { IconCarrot, IconPlus, IconToolsKitchen2 } from "@/components/icons";
import { Combobox as ComboboxPrimitive } from "@kobalte/core/combobox";
import {
  ComboboxContent,
  ComboboxControl,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemLabel,
  ComboboxLabel,
  ComboboxListbox,
  ComboboxPortal,
  ComboboxSection,
} from "@/components/ui/combobox";
import type { Catalog, CatalogKind } from "@/lib/catalog";
import { createMemo, createSignal, Match, Show, Switch } from "solid-js";
import { Dynamic } from "solid-js/web";

type Option = {
  key: string;
  id: number | null;
  name: string;
  group: "picked" | "catalog" | "create";
};

type Group = { label: string; options: Option[] };

const kindLabel: Record<CatalogKind, string> = { ingredient: "Ingredient", tool: "Tool" };

/**
 * Combobox over the catalog. Items already picked for the recipe come first. Typing a name
 * that is not there offers "Create". Picking resets the field, so it works as an "add" box.
 */
export function ItemPicker(props: {
  kind: CatalogKind;
  catalog: Catalog;
  picked?: number[];
  exclude?: number[];
  onPick: (id: number) => void;
  label?: string;
  placeholder?: string;
  autofocus?: boolean;
}) {
  const [query, setQuery] = createSignal("");
  const [version, setVersion] = createSignal(0);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string>();

  const groups = createMemo<Group[]>(() => {
    const excluded = new Set(props.exclude ?? []);
    const picked = new Set(props.picked ?? []);
    const all = props.catalog.items(props.kind).filter((item) => !excluded.has(item.id));
    const text = query().trim();
    const exact = all.some((item) => item.name.toLowerCase() === text.toLowerCase());
    const toOption = (group: Option["group"]) => (item: { id: number; name: string }) => ({
      key: `${group}:${item.id}`,
      id: item.id,
      name: item.name,
      group,
    });
    const result: Group[] = [];
    const first = all.filter((item) => picked.has(item.id)).map(toOption("picked"));
    if (first.length > 0) result.push({ label: "In this recipe", options: first });
    result.push({
      label: "All",
      options: all.filter((item) => !picked.has(item.id)).map(toOption("catalog")),
    });
    if (text && !exact) {
      result.push({
        label: "New",
        options: [{ key: `create:${text}`, id: null, name: text, group: "create" }],
      });
    }
    return result;
  });

  const choose = async (option: Option | null) => {
    if (!option) return;
    setError(undefined);
    try {
      if (option.id != null) {
        props.onPick(option.id);
      } else {
        setBusy(true);
        const created = await props.catalog.create(props.kind, option.name);
        props.onPick(created.id);
      }
    } catch {
      setError(`Could not add "${option.name}"`);
    } finally {
      setBusy(false);
      setQuery("");
      setVersion((value) => value + 1);
    }
  };

  const icon = () => (props.kind === "ingredient" ? IconCarrot : IconToolsKitchen2);

  return (
    // Keyed on `version`: a fresh combobox after each pick clears its text field.
    <Show when={version() + 1} keyed>
      <ComboboxPrimitive<Option, Group>
        gutter={6}
        class="flex flex-col gap-2 text-xs text-foreground data-disabled:opacity-50"
        options={groups()}
        optionValue="key"
        optionLabel="name"
        optionTextValue="name"
        optionGroupChildren="options"
        value={null}
        onChange={(option) => void choose(option)}
        onInputChange={setQuery}
        placeholder={props.placeholder ?? `Add ${kindLabel[props.kind].toLowerCase()}`}
        disabled={busy()}
        defaultFilter={(option, input) =>
          option.group === "create" || option.name.toLowerCase().includes(input.toLowerCase())
        }
        sectionComponent={(section) => (
          <ComboboxSection>{section.section.rawValue.label}</ComboboxSection>
        )}
        itemComponent={(item) => (
          <ComboboxItem item={item.item} class="min-h-9 text-sm">
            <ComboboxItemLabel class="flex items-center gap-2">
              <Switch>
                <Match when={item.item.rawValue.group === "create"}>
                  <IconPlus size={16} aria-hidden="true" />
                  <span>
                    Create <strong>{item.item.rawValue.name}</strong>
                  </span>
                </Match>
                <Match when={true}>
                  <Dynamic component={icon()} size={16} stroke={1.75} aria-hidden="true" />
                  <span>{item.item.rawValue.name}</span>
                </Match>
              </Switch>
            </ComboboxItemLabel>
          </ComboboxItem>
        )}
      >
        <Show when={props.label}>
          <ComboboxLabel>{props.label}</ComboboxLabel>
        </Show>
        <ComboboxControl
          class="h-10 gap-2 pl-2.5"
          aria-label={props.label ?? kindLabel[props.kind]}
        >
          <Dynamic
            component={icon()}
            size={18}
            stroke={1.75}
            aria-hidden="true"
            class="shrink-0 text-muted-foreground"
          />
          <ComboboxInput
            class="text-sm"
            ref={(element: HTMLInputElement) => {
              // `autofocus` only works on page load. Pickers open later, so focus by hand.
              if (props.autofocus || version() > 0) queueMicrotask(() => element.focus());
            }}
          />
        </ComboboxControl>
        <Show when={error()}>
          <p class="text-xs text-destructive" role="alert">
            {error()}
          </p>
        </Show>
        <ComboboxPortal>
          <ComboboxContent>
            <ComboboxListbox class="max-h-72 overflow-y-auto" />
          </ComboboxContent>
        </ComboboxPortal>
      </ComboboxPrimitive>
    </Show>
  );
}
