import type {
  IngredientAltWrite,
  NodeIngredientWrite,
  NodeToolWrite,
  NodeWriteBranchMode,
  NodeWriteJoinMode,
  RecipeDetail,
  RecipeWrite,
  RecipeWriteVisibility,
  SpanWrite,
  ToolAltWrite,
} from "@/generated/model";

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
  ingredientAlts: IngredientAltWrite[];
  toolAlts: ToolAltWrite[];
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
    nodes: [blankNode(0, "step-1")],
    edges: [],
    ingredientAlts: [],
    toolAlts: [],
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
        })),
        tools: node.tools.map((item) => ({
          toolId: item.toolId,
          optional: item.optional,
          hold: item.hold,
        })),
      })),
    edges: recipe.edges.flatMap((edge) => {
      const from = keyById.get(edge.fromNodeId);
      const to = keyById.get(edge.toNodeId);
      if (!from || !to) return [];
      return [{ from, to, label: edge.label }];
    }),
    ingredientAlts: recipe.ingredientAlts.map((alt) => ({
      ingredientId: alt.ingredientId,
      altIngredientId: alt.altIngredientId,
      nodeKey: alt.nodeId == null ? null : (keyById.get(alt.nodeId) ?? null),
      ratio: alt.ratio,
      note: alt.note,
    })),
    toolAlts: recipe.toolAlts.map((alt) => ({
      toolId: alt.toolId,
      altToolId: alt.altToolId,
      nodeKey: alt.nodeId == null ? null : (keyById.get(alt.nodeId) ?? null),
      note: alt.note,
    })),
    photos: (recipe.photos ?? []).map((photo) => ({ id: photo.id, alt: photo.alt ?? "" })),
  };
}

export function draftToWrite(draft: RecipeDraft): RecipeWrite {
  const keys = new Set(draft.nodes.map((node) => node.key));
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
      branchMode: node.branchMode,
      joinMode: node.joinMode,
      repeatMin: node.repeatMin,
      repeatMax: node.repeatMax,
      ord: index,
      spans: node.spans,
      ingredients: node.ingredients,
      tools: node.tools,
    })),
    edges: draft.edges
      .filter((edge) => edge.from && edge.to && keys.has(edge.from) && keys.has(edge.to))
      .map((edge) => ({ from: edge.from, to: edge.to, label: edge.label })),
    ingredientAlts: draft.ingredientAlts,
    toolAlts: draft.toolAlts,
    photos: draft.photos.map((photo) => ({ id: photo.id, alt: photo.alt })),
  };
}
