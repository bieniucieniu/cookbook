import { Ingredients } from "@/generated/ingredients/ingredients";
import type { Ingredient, Tool } from "@/generated/model";
import { Tools } from "@/generated/tools/tools";
import { createMemo } from "solid-js";

export type CatalogKind = "ingredient" | "tool";

export type CatalogItem = { id: number; slug: string; name: string };

export type Catalog = {
  items: (kind: CatalogKind) => CatalogItem[];
  name: (kind: CatalogKind, id: number) => string;
  create: (kind: CatalogKind, name: string) => Promise<CatalogItem>;
};

/**
 * ASCII slug for the catalog API (`[a-z0-9]+(-[a-z0-9]+)*`). Accents fold to plain letters.
 * Letters with no ASCII form (Cyrillic, CJK, …) are dropped, so a short hash of the whole name
 * keeps the slug non-empty and distinct from a Latin name it would otherwise collide with.
 */
export function slugify(name: string): string {
  const folded = name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
  const ascii = folded.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const lost = /[\u0080-\uffff]/.test(folded);
  if (!lost) return ascii;
  return ascii ? `${ascii}-${nameHash(folded)}` : `item-${nameHash(folded)}`;
}

/** FNV-1a over the UTF-16 code units, in base 36. Stable across sessions. */
function nameHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

/** Rows with an id (the model marks it optional), sorted by name. */
function listed(rows: (Ingredient | Tool)[]): CatalogItem[] {
  return rows
    .flatMap((row) =>
      typeof row.id === "number" ? [{ id: row.id, slug: row.slug, name: row.name }] : []
    )
    .sort((left, right) => left.name.localeCompare(right.name));
}

/** Starts loading both dictionaries, for a route's `preload`. */
export function preloadCatalog(): void {
  void Ingredients.listIngredients();
  void Tools.listTools();
}

/** The ingredient and tool dictionaries. Reading them suspends to the nearest `<Loading>`. */
export function useCatalog(): Catalog {
  const ingredientItems = createMemo(async () => listed(await Ingredients.listIngredients()));
  const toolItems = createMemo(async () => listed(await Tools.listTools()));
  const ingredientNames = createMemo(
    () => new Map(ingredientItems().map((item) => [item.id, item.name]))
  );
  const toolNames = createMemo(() => new Map(toolItems().map((item) => [item.id, item.name])));

  return {
    items: (kind) => (kind === "ingredient" ? ingredientItems() : toolItems()),
    name: (kind, id) =>
      (kind === "ingredient" ? ingredientNames() : toolNames()).get(id) ?? `#${id}`,
    async create(kind, name) {
      const trimmed = name.trim();
      const data = { name: trimmed, slug: slugify(trimmed) };
      if (kind === "ingredient") {
        const created = await Ingredients.createIngredient(data);
        return createdItem(created);
      }
      const created = await Tools.createTool(data);
      return createdItem(created);
    },
  };
}

/** A create without an id cannot be picked: fail so the picker shows its error, not item #0. */
function createdItem(data: { id?: number | null; slug: string; name: string }): CatalogItem {
  if (typeof data.id !== "number") throw new Error(`Created "${data.name}" has no id`);
  return { id: data.id, slug: data.slug, name: data.name };
}
