import type {
  NodeIngredientWrite,
  NodeToolWrite,
  NodeWriteBranchMode,
  NodeWriteJoinMode,
  RecipeDetail,
  RecipeWrite,
  RecipeWriteVisibility,
  SpanWrite,
} from "@/generated/model";
import { deriveModes } from "@/lib/recipe-graph";

export type DraftNode = {
  key: string;
  title: string;
  body: string;
  branchMode: NodeWriteBranchMode;
  joinMode: NodeWriteJoinMode;
  repeatMin: number;
  repeatMax: number;
  ord: number;
  spans: SpanWrite[];
  ingredients: NodeIngredientWrite[];
  tools: NodeToolWrite[];
};

export type DraftEdge = {
  from: string;
  to: string;
  label: string;
};

export type DraftPhoto = {
  id: number;
  alt: string;
};

export type RecipeDraft = {
  title: string;
  description: string;
  notes: string;
  cooks: number;
  visibility: RecipeWriteVisibility;
  nodes: DraftNode[];
  edges: DraftEdge[];
  photos: DraftPhoto[];
};

export function blankNode(ord: number, key: string): DraftNode {
  return {
    key,
    title: "",
    body: "",
    branchMode: "none",
    joinMode: "none",
    repeatMin: 1,
    repeatMax: 1,
    ord,
    spans: [],
    ingredients: [],
    tools: [],
  };
}

export function nextStepKey(nodes: { key: string }[]): string {
  const keys = new Set(nodes.map((node) => node.key));
  let index = nodes.length + 1;
  while (keys.has(`step-${index}`)) index += 1;
  return `step-${index}`;
}

export function blankDraft(): RecipeDraft {
  return {
    title: "",
    description: "",
    notes: "",
    cooks: 1,
    visibility: "public",
    nodes: [],
    edges: [],
    photos: [],
  };
}

export function detailToDraft(recipe: RecipeDetail): RecipeDraft {
  const keyById = new Map(recipe.nodes.map((node) => [node.id, node.key]));
  return {
    title: recipe.title,
    description: recipe.description,
    notes: recipe.notes,
    cooks: recipe.cooks,
    visibility: recipe.visibility,
    nodes: [...recipe.nodes]
      .sort((left, right) => left.ord - right.ord)
      .map((node) => ({
        key: node.key,
        title: node.title,
        body: node.body,
        branchMode: node.branchMode,
        joinMode: node.joinMode,
        repeatMin: node.repeatMin,
        repeatMax: node.repeatMax,
        ord: node.ord,
        spans: node.spans.map((span) => ({
          ord: span.ord,
          kind: span.kind,
          seconds: span.seconds,
        })),
        ingredients: node.ingredients.map((item) => ({
          ingredientId: item.ingredientId,
          qty: item.qty,
          unit: item.unit,
          optional: item.optional,
          alts: (item.alts ?? []).map((alt) => ({
            altIngredientId: alt.altIngredientId,
            ratio: alt.ratio,
            note: alt.note,
          })),
        })),
        tools: node.tools.map((item) => ({
          toolId: item.toolId,
          optional: item.optional,
          hold: item.hold,
          alts: (item.alts ?? []).map((alt) => ({ altToolId: alt.altToolId, note: alt.note })),
        })),
      })),
    edges: recipe.edges.flatMap((edge) => {
      const from = keyById.get(edge.fromNodeId);
      const to = keyById.get(edge.toNodeId);
      if (!from || !to) return [];
      return [{ from, to, label: edge.label }];
    }),
    photos: (recipe.photos ?? []).map((photo) => ({ id: photo.id, alt: photo.alt ?? "" })),
  };
}

export function draftToWrite(draft: RecipeDraft): RecipeWrite {
  const keys = new Set(draft.nodes.map((node) => node.key));
  const modes = deriveModes(draft.nodes, draft.edges);
  return {
    title: draft.title.trim(),
    description: draft.description,
    notes: draft.notes,
    cooks: draft.cooks,
    visibility: draft.visibility,
    nodes: draft.nodes.map((node, index) => ({
      key: node.key,
      title: node.title.trim(),
      body: node.body,
      branchMode: modes.get(node.key)?.branchMode ?? "none",
      joinMode: modes.get(node.key)?.joinMode ?? "none",
      repeatMin: node.repeatMin,
      repeatMax: node.repeatMax,
      ord: index,
      spans: node.spans.map((span, ord) => ({ ...span, ord })),
      ingredients: node.ingredients,
      tools: node.tools,
    })),
    edges: draft.edges
      .filter((edge) => edge.from && edge.to && keys.has(edge.from) && keys.has(edge.to))
      .map((edge) => ({ from: edge.from, to: edge.to, label: edge.label })),
    photos: draft.photos.map((photo) => ({ id: photo.id, alt: photo.alt })),
  };
}

export function stepSeconds(node: Pick<DraftNode, "spans" | "repeatMin">): number {
  return node.spans.reduce((total, span) => total + span.seconds, 0) * node.repeatMin;
}

export function activeSeconds(node: Pick<DraftNode, "spans" | "repeatMin">): number {
  return (
    node.spans
      .filter((span) => span.kind === "active")
      .reduce((total, span) => total + span.seconds, 0) * node.repeatMin
  );
}

/** Wall clock along the longest path, ignoring cook limits. A rough figure for the builder. */
export function roughSeconds(draft: Pick<RecipeDraft, "nodes" | "edges">): number {
  const byKey = new Map(draft.nodes.map((node) => [node.key, node]));
  const memo = new Map<string, number>();
  const visiting = new Set<string>();
  const finish = (key: string): number => {
    const known = memo.get(key);
    if (known !== undefined) return known;
    if (visiting.has(key)) return 0;
    visiting.add(key);
    const before = draft.edges
      .filter((edge) => edge.to === key)
      .reduce((longest, edge) => Math.max(longest, finish(edge.from)), 0);
    visiting.delete(key);
    const node = byKey.get(key);
    const total = before + (node ? stepSeconds(node) : 0);
    memo.set(key, total);
    return total;
  };
  return draft.nodes.reduce((longest, node) => Math.max(longest, finish(node.key)), 0);
}
