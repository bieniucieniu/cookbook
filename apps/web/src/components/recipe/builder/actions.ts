import type {
  IngredientSwapWrite,
  NodeIngredientWrite,
  NodeToolWrite,
  NodeWriteBranchMode,
  SpanWrite,
  ToolSwapWrite,
} from "@/generated/model";
import { blankNode, nextStepKey, type DraftNode, type RecipeDraft } from "@/lib/recipe-draft";
import {
  attachEdges,
  detachEdges,
  incoming,
  outgoing,
  placement,
  type Relation,
} from "@/lib/recipe-graph";
import { produce, type SetStoreFunction } from "solid-js/store";

export type DraftActions = ReturnType<typeof createDraftActions>;

/** Every draft edit in one place, so the panes stay thin and graph cleanup is not forgotten. */
export function createDraftActions(draft: RecipeDraft, setDraft: SetStoreFunction<RecipeDraft>) {
  const indexOf = (key: string) => draft.nodes.findIndex((node) => node.key === key);
  const renumber = (nodes: DraftNode[]) => nodes.forEach((node, ord) => (node.ord = ord));
  const plain = () => draft.edges.map((edge) => ({ from: edge.from, to: edge.to }));

  /** Rewires `key` to `relation` of `anchor`, keeping labels of edges that survive. */
  const wire = (key: string, relation: Relation, anchor: string | undefined) => {
    const detached = detachEdges(key, plain());
    const { edges, modes } = attachEdges(key, relation, anchor, draft.nodes, detached);
    setDraft(
      produce((state) => {
        state.edges = edges.map((edge) => ({
          ...edge,
          label:
            state.edges.find((old) => old.from === edge.from && old.to === edge.to)?.label ?? "",
        }));
        for (const [nodeKey, mode] of modes) {
          const node = state.nodes.find((item) => item.key === nodeKey);
          if (node) node.branchMode = mode;
        }
      })
    );
  };

  /** List position for a step placed at `relation` to `anchor`: right after the anchor. */
  const positionFor = (anchor: string | undefined) => {
    if (anchor === undefined) return draft.nodes.length;
    const at = indexOf(anchor);
    return at < 0 ? draft.nodes.length : at + 1;
  };

  const patchItem = <T extends "ingredients" | "tools">(
    key: string,
    field: T,
    match: (item: DraftNode[T][number]) => boolean,
    update: (item: DraftNode[T][number]) => void
  ) =>
    setDraft(
      produce((state) => {
        const node = state.nodes.find((item) => item.key === key);
        const list: DraftNode[T][number][] | undefined = node?.[field];
        const item = list?.find(match);
        if (item) update(item);
      })
    );

  return {
    canPlace: (anchor: string, relation: Relation) =>
      placement(anchor, relation, draft.nodes, draft.edges),

    /** Adds an empty step at `relation` to `anchor`. No anchor: after every open arm. */
    addStep(relation: Relation, anchor?: string): string | undefined {
      if (anchor !== undefined && !placement(anchor, relation, draft.nodes, draft.edges).ok) {
        return undefined;
      }
      const key = nextStepKey(draft.nodes);
      const at = positionFor(anchor);
      setDraft(
        produce((state) => {
          state.nodes.splice(at, 0, blankNode(at, key));
          renumber(state.nodes);
        })
      );
      wire(key, relation, anchor);
      return key;
    },

    /** Moves an existing step. The check runs on the graph without it. */
    place(key: string, relation: Relation, anchor: string | undefined) {
      if (anchor === key) return;
      if (anchor !== undefined) {
        const without = detachEdges(key, plain());
        const others = draft.nodes.filter((node) => node.key !== key);
        if (!placement(anchor, relation, others, without).ok) return;
      }
      setDraft(
        produce((state) => {
          const from = state.nodes.findIndex((node) => node.key === key);
          const [node] = state.nodes.splice(from, 1);
          if (!node) return;
          const anchorAt =
            anchor === undefined ? -1 : state.nodes.findIndex((item) => item.key === anchor);
          state.nodes.splice(anchorAt < 0 ? state.nodes.length : anchorAt + 1, 0, node);
          renumber(state.nodes);
        })
      );
      wire(key, relation, anchor);
    },

    /** Placement moves only plain steps: one step before, one after at most. */
    movable: (key: string) =>
      incoming(key, draft.edges).length <= 1 && outgoing(key, draft.edges).length <= 1,

    addEdge(from: string, to: string) {
      if (from === to) return;
      if (draft.edges.some((edge) => edge.from === from && edge.to === to)) return;
      setDraft("edges", (edges) => [...edges, { from, to, label: "" }]);
    },
    removeEdge(from: string, to: string) {
      setDraft("edges", (edges) => edges.filter((edge) => !(edge.from === from && edge.to === to)));
    },
    setEdgeLabel(from: string, to: string, label: string) {
      const index = draft.edges.findIndex((edge) => edge.from === from && edge.to === to);
      if (index >= 0) setDraft("edges", index, "label", label);
    },

    duplicateStep(key: string): string | undefined {
      const at = indexOf(key);
      const source = draft.nodes[at];
      if (!source) return undefined;
      const newKey = nextStepKey(draft.nodes);
      setDraft(
        produce((state) => {
          state.nodes.splice(at + 1, 0, {
            ...(JSON.parse(JSON.stringify(source)) as DraftNode),
            key: newKey,
          });
          renumber(state.nodes);
        })
      );
      wire(newKey, "next", key);
      return newKey;
    },

    removeStep(key: string) {
      const edges = detachEdges(key, plain());
      setDraft(
        produce((state) => {
          state.nodes = state.nodes.filter((node) => node.key !== key);
          renumber(state.nodes);
          state.edges = edges.map((edge) => ({
            ...edge,
            label:
              state.edges.find((old) => old.from === edge.from && old.to === edge.to)?.label ?? "",
          }));
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
      const node = draft.nodes[at];
      if (!node || node.ingredients.some((item) => item.ingredientId === ingredientId)) return;
      // A new use follows how the rest of the recipe uses it, so optional never mixes.
      const optional = draft.nodes.some((other) =>
        other.ingredients.some((item) => item.ingredientId === ingredientId && item.optional)
      );
      setDraft("nodes", at, "ingredients", (items) => [
        ...items,
        { ingredientId, qty: null, unit: null, optional, alts: [] },
      ]);
    },
    patchIngredient(key: string, ingredientId: number, patch: Partial<NodeIngredientWrite>) {
      patchItem(
        key,
        "ingredients",
        (item) => item.ingredientId === ingredientId,
        (item) => Object.assign(item, patch)
      );
    },
    /** Sets optional on every step that uses the ingredient. */
    setIngredientOptional(ingredientId: number, optional: boolean) {
      setDraft(
        produce((state) => {
          for (const node of state.nodes)
            for (const item of node.ingredients)
              if (item.ingredientId === ingredientId) item.optional = optional;
        })
      );
    },
    removeIngredient(key: string, ingredientId: number) {
      const at = indexOf(key);
      if (at < 0) return;
      setDraft("nodes", at, "ingredients", (items) =>
        items.filter((item) => item.ingredientId !== ingredientId)
      );
    },
    addIngredientAlt(key: string, ingredientId: number, altIngredientId: number) {
      if (altIngredientId === ingredientId) return;
      patchItem(
        key,
        "ingredients",
        (item) => item.ingredientId === ingredientId,
        (item) => {
          const alts = item.alts ?? [];
          if (alts.some((alt) => alt.altIngredientId === altIngredientId)) return;
          item.alts = [...alts, { altIngredientId, ratio: 1, note: "" }];
        }
      );
    },
    patchIngredientAlt(
      key: string,
      ingredientId: number,
      altIngredientId: number,
      patch: Partial<IngredientSwapWrite>
    ) {
      patchItem(
        key,
        "ingredients",
        (item) => item.ingredientId === ingredientId,
        (item) => {
          item.alts = (item.alts ?? []).map((alt) =>
            alt.altIngredientId === altIngredientId ? { ...alt, ...patch } : alt
          );
        }
      );
    },
    removeIngredientAlt(key: string, ingredientId: number, altIngredientId: number) {
      patchItem(
        key,
        "ingredients",
        (item) => item.ingredientId === ingredientId,
        (item) => {
          item.alts = (item.alts ?? []).filter((alt) => alt.altIngredientId !== altIngredientId);
        }
      );
    },

    addTool(key: string, toolId: number) {
      const at = indexOf(key);
      const node = draft.nodes[at];
      if (!node || node.tools.some((item) => item.toolId === toolId)) return;
      const optional = draft.nodes.some((other) =>
        other.tools.some((item) => item.toolId === toolId && item.optional)
      );
      setDraft("nodes", at, "tools", (items) => [
        ...items,
        { toolId, optional, hold: "active" as const, alts: [] },
      ]);
    },
    patchTool(key: string, toolId: number, patch: Partial<NodeToolWrite>) {
      patchItem(
        key,
        "tools",
        (item) => item.toolId === toolId,
        (item) => Object.assign(item, patch)
      );
    },
    setToolOptional(toolId: number, optional: boolean) {
      setDraft(
        produce((state) => {
          for (const node of state.nodes)
            for (const item of node.tools) if (item.toolId === toolId) item.optional = optional;
        })
      );
    },
    removeTool(key: string, toolId: number) {
      const at = indexOf(key);
      if (at < 0) return;
      setDraft("nodes", at, "tools", (items) => items.filter((item) => item.toolId !== toolId));
    },
    addToolAlt(key: string, toolId: number, altToolId: number) {
      if (altToolId === toolId) return;
      patchItem(
        key,
        "tools",
        (item) => item.toolId === toolId,
        (item) => {
          const alts = item.alts ?? [];
          if (alts.some((alt) => alt.altToolId === altToolId)) return;
          item.alts = [...alts, { altToolId, note: "" }];
        }
      );
    },
    patchToolAlt(key: string, toolId: number, altToolId: number, patch: Partial<ToolSwapWrite>) {
      patchItem(
        key,
        "tools",
        (item) => item.toolId === toolId,
        (item) => {
          item.alts = (item.alts ?? []).map((alt) =>
            alt.altToolId === altToolId ? { ...alt, ...patch } : alt
          );
        }
      );
    },
    removeToolAlt(key: string, toolId: number, altToolId: number) {
      patchItem(
        key,
        "tools",
        (item) => item.toolId === toolId,
        (item) => {
          item.alts = (item.alts ?? []).filter((alt) => alt.altToolId !== altToolId);
        }
      );
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
  };
}
