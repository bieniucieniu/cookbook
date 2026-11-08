import type {
  NodeIngredientWrite,
  NodeToolWrite,
  NodeWriteBranchMode,
  SpanWrite,
} from "@/generated/model";
import { blankNode, nextStepKey, type DraftNode, type RecipeDraft } from "@/lib/recipe-draft";
import { autoWire, incoming, outgoing } from "@/lib/recipe-graph";
import { produce, type SetStoreFunction } from "solid-js/store";

export type DraftActions = ReturnType<typeof createDraftActions>;

/** Every draft edit in one place, so stages stay thin and graph cleanup is not forgotten. */
export function createDraftActions(draft: RecipeDraft, setDraft: SetStoreFunction<RecipeDraft>) {
  const indexOf = (key: string) => draft.nodes.findIndex((node) => node.key === key);
  const renumber = (nodes: DraftNode[]) => nodes.forEach((node, ord) => (node.ord = ord));

  const addEdge = (from: string, to: string) => {
    if (from === to) return;
    if (draft.edges.some((edge) => edge.from === from && edge.to === to)) return;
    setDraft("edges", (edges) => [...edges, { from, to, label: "" }]);
  };

  const removeEdge = (from: string, to: string) =>
    setDraft("edges", (edges) => edges.filter((edge) => !(edge.from === from && edge.to === to)));

  const insertStep = (node: DraftNode, at?: number) =>
    setDraft(
      produce((state) => {
        state.nodes.splice(at ?? state.nodes.length, 0, node);
        renumber(state.nodes);
      })
    );

  const pantryAdd = (kind: "ingredient" | "tool", id: number) => {
    const field = kind === "ingredient" ? "ingredients" : "tools";
    if (draft.pantry[field].includes(id)) return;
    setDraft("pantry", field, (ids) => [...ids, id]);
  };

  return {
    addEdge,
    removeEdge,
    setEdgeLabel(from: string, to: string, label: string) {
      const index = draft.edges.findIndex((edge) => edge.from === from && edge.to === to);
      if (index >= 0) setDraft("edges", index, "label", label);
    },

    /** Appends a step after every open arm, so a linear recipe never needs the graph. */
    addStep(init: Partial<Pick<DraftNode, "title" | "ingredients" | "tools" | "spans">>): string {
      const key = nextStepKey(draft.nodes);
      const wires = autoWire(
        draft.nodes.map((node) => node.key),
        draft.edges,
        key
      );
      insertStep({ ...blankNode(draft.nodes.length, key), ...init });
      for (const wire of wires) addEdge(wire.from, wire.to);
      return key;
    },

    /** A parallel arm next to `key`: same steps before it, same steps after it. */
    branchFrom(key: string): string | undefined {
      const at = indexOf(key);
      if (at < 0) return undefined;
      const newKey = nextStepKey(draft.nodes);
      const before = incoming(key, draft.edges);
      const after = outgoing(key, draft.edges);
      insertStep(blankNode(at + 1, newKey), at + 1);
      for (const from of before) addEdge(from, newKey);
      for (const to of after) addEdge(newKey, to);
      return newKey;
    },

    duplicateStep(key: string): string | undefined {
      const at = indexOf(key);
      const source = draft.nodes[at];
      if (!source) return undefined;
      const newKey = nextStepKey(draft.nodes);
      insertStep(
        {
          ...source,
          key: newKey,
          spans: source.spans.map((span) => ({ ...span })),
          ingredients: source.ingredients.map((item) => ({ ...item })),
          tools: source.tools.map((item) => ({ ...item })),
        },
        at + 1
      );
      // The copy runs right after the original: original → copy → original's next steps.
      const next = outgoing(key, draft.edges);
      setDraft("edges", (edges) => [
        ...edges.filter((edge) => !(edge.from === key && next.includes(edge.to))),
        { from: key, to: newKey, label: "" },
        ...next.map((to) => ({ from: newKey, to, label: "" })),
      ]);
      return newKey;
    },

    removeStep(key: string) {
      const before = incoming(key, draft.edges);
      const after = outgoing(key, draft.edges);
      setDraft(
        produce((state) => {
          state.nodes = state.nodes.filter((node) => node.key !== key);
          renumber(state.nodes);
          state.edges = state.edges.filter((edge) => edge.from !== key && edge.to !== key);
          // Keep the chain closed: what came before now leads to what came after.
          for (const from of before) {
            for (const to of after) {
              if (!state.edges.some((edge) => edge.from === from && edge.to === to)) {
                state.edges.push({ from, to, label: "" });
              }
            }
          }
          state.ingredientAlts = state.ingredientAlts.map((alt) =>
            alt.nodeKey === key ? { ...alt, nodeKey: null } : alt
          );
          state.toolAlts = state.toolAlts.map((alt) =>
            alt.nodeKey === key ? { ...alt, nodeKey: null } : alt
          );
        })
      );
    },

    /** Swaps list position only. Wiring stays as it is. */
    moveStep(key: string, delta: -1 | 1) {
      const at = indexOf(key);
      const to = at + delta;
      if (at < 0 || to < 0 || to >= draft.nodes.length) return;
      setDraft(
        produce((state) => {
          const [node] = state.nodes.splice(at, 1);
          if (node) state.nodes.splice(to, 0, node);
          renumber(state.nodes);
        })
      );
    },

    setStep<K extends keyof DraftNode>(key: string, field: K, value: DraftNode[K]) {
      const at = indexOf(key);
      if (at >= 0) setDraft("nodes", at, field, value);
    },

    setBranchMode(key: string, mode: NodeWriteBranchMode) {
      const at = indexOf(key);
      if (at >= 0) setDraft("nodes", at, "branchMode", mode);
    },

    addIngredient(key: string, ingredientId: number) {
      const at = indexOf(key);
      if (at < 0 || draft.nodes[at]?.ingredients.some((item) => item.ingredientId === ingredientId))
        return;
      setDraft("nodes", at, "ingredients", (items) => [
        ...items,
        { ingredientId, qty: null, unit: null, optional: false },
      ]);
      pantryAdd("ingredient", ingredientId);
    },
    patchIngredient(key: string, ingredientId: number, patch: Partial<NodeIngredientWrite>) {
      const at = indexOf(key);
      if (at < 0) return;
      setDraft("nodes", at, "ingredients", (item) => item.ingredientId === ingredientId, patch);
    },
    removeIngredient(key: string, ingredientId: number) {
      const at = indexOf(key);
      if (at < 0) return;
      setDraft("nodes", at, "ingredients", (items) =>
        items.filter((item) => item.ingredientId !== ingredientId)
      );
    },

    addTool(key: string, toolId: number) {
      const at = indexOf(key);
      if (at < 0 || draft.nodes[at]?.tools.some((item) => item.toolId === toolId)) return;
      setDraft("nodes", at, "tools", (items) => [
        ...items,
        { toolId, optional: false, hold: "active" as const },
      ]);
      pantryAdd("tool", toolId);
    },
    patchTool(key: string, toolId: number, patch: Partial<NodeToolWrite>) {
      const at = indexOf(key);
      if (at < 0) return;
      setDraft("nodes", at, "tools", (item) => item.toolId === toolId, patch);
    },
    removeTool(key: string, toolId: number) {
      const at = indexOf(key);
      if (at < 0) return;
      setDraft("nodes", at, "tools", (items) => items.filter((item) => item.toolId !== toolId));
    },

    addSpan(key: string, span: Omit<SpanWrite, "ord">) {
      const at = indexOf(key);
      if (at < 0) return;
      setDraft("nodes", at, "spans", (spans) => [...spans, { ...span, ord: spans.length }]);
    },
    patchSpan(key: string, index: number, patch: Partial<SpanWrite>) {
      const at = indexOf(key);
      if (at >= 0) setDraft("nodes", at, "spans", index, patch);
    },
    removeSpan(key: string, index: number) {
      const at = indexOf(key);
      if (at < 0) return;
      setDraft("nodes", at, "spans", (spans) =>
        spans.filter((_, spanIndex) => spanIndex !== index)
      );
    },

    pantryAdd,
    /** Drops the item from the recipe and from every step that uses it. */
    pantryRemove(kind: "ingredient" | "tool", id: number) {
      setDraft(
        produce((state) => {
          if (kind === "ingredient") {
            state.pantry.ingredients = state.pantry.ingredients.filter((item) => item !== id);
            for (const node of state.nodes)
              node.ingredients = node.ingredients.filter((item) => item.ingredientId !== id);
            state.ingredientAlts = state.ingredientAlts.filter(
              (alt) => alt.ingredientId !== id && alt.altIngredientId !== id
            );
          } else {
            state.pantry.tools = state.pantry.tools.filter((item) => item !== id);
            for (const node of state.nodes)
              node.tools = node.tools.filter((item) => item.toolId !== id);
            state.toolAlts = state.toolAlts.filter(
              (alt) => alt.toolId !== id && alt.altToolId !== id
            );
          }
        })
      );
    },

    /** Recipe-wide (`nodeKey` null) or step-level swap for an ingredient. One per pair and scope. */
    setIngredientAlt(
      ingredientId: number,
      altIngredientId: number | null,
      nodeKey: string | null,
      ratio = 1
    ) {
      setDraft("ingredientAlts", (alts) => {
        const rest = alts.filter(
          (alt) => !(alt.ingredientId === ingredientId && (alt.nodeKey ?? null) === nodeKey)
        );
        if (altIngredientId == null || altIngredientId === ingredientId) return rest;
        return [...rest, { ingredientId, altIngredientId, nodeKey, ratio, note: "" }];
      });
      if (altIngredientId != null) pantryAdd("ingredient", altIngredientId);
    },
  };
}
