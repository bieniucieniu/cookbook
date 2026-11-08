import type { Catalog, CatalogItem, CatalogKind } from "@/lib/catalog";
import { blankDraft, blankNode, type RecipeDraft } from "@/lib/recipe-draft";

const items: Record<CatalogKind, CatalogItem[]> = {
  ingredient: [
    { id: 1, slug: "egg", name: "Egg" },
    { id: 2, slug: "tomato", name: "Tomato" },
    { id: 3, slug: "garlic", name: "Garlic" },
    { id: 4, slug: "bread", name: "Bread" },
  ],
  tool: [
    { id: 1, slug: "skillet", name: "Skillet" },
    { id: 2, slug: "oven", name: "Oven" },
  ],
};

/** In-memory catalog for stories. `create` appends locally. */
export function fakeCatalog(): Catalog {
  let next = 100;
  return {
    items: (kind) => items[kind],
    name: (kind, id) => items[kind].find((item) => item.id === id)?.name ?? `#${id}`,
    loading: () => false,
    async create(kind, name) {
      const item = { id: next++, slug: name.toLowerCase(), name };
      items[kind].push(item);
      return item;
    },
  };
}

/** The example graph from docs/recipes.md: an `and` split, then an `xor` split. */
export function sampleDraft(): RecipeDraft {
  const node = (ord: number, key: string, title: string) => ({ ...blankNode(ord, key), title });
  return {
    ...blankDraft(),
    title: "Shakshuka",
    nodes: [
      { ...node(0, "prep", "Prep"), branchMode: "and" as const },
      {
        ...node(1, "sauce", "Simmer sauce"),
        ingredients: [
          { ingredientId: 2, qty: 400, unit: "g", optional: false },
          { ingredientId: 3, qty: 2, unit: "clove", optional: false },
        ],
        tools: [{ toolId: 1, optional: false, hold: "span" as const }],
        spans: [
          { ord: 0, kind: "active" as const, seconds: 300 },
          { ord: 1, kind: "wait" as const, seconds: 1200 },
        ],
      },
      {
        ...node(2, "toast", "Toast bread"),
        ingredients: [{ ingredientId: 4, qty: 2, unit: "pcs", optional: false }],
        spans: [{ ord: 0, kind: "active" as const, seconds: 480 }],
      },
      {
        ...node(3, "eggs", "Add eggs"),
        branchMode: "xor" as const,
        ingredients: [{ ingredientId: 1, qty: 4, unit: "pcs", optional: false }],
      },
      node(4, "pan", "Finish in pan"),
      {
        ...node(5, "broil", "Broil"),
        tools: [{ toolId: 2, optional: false, hold: "span" as const }],
      },
      node(6, "serve", "Serve"),
    ],
    edges: [
      ["prep", "sauce"],
      ["prep", "toast"],
      ["sauce", "eggs"],
      ["toast", "eggs"],
      ["eggs", "pan"],
      ["eggs", "broil"],
      ["pan", "serve"],
      ["broil", "serve"],
    ].map(([from = "", to = ""]) => ({ from, to, label: "" })),
  };
}
