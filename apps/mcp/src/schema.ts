import { z } from "zod";

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: "slug must match [a-z0-9]+(-[a-z0-9]+)*" });

const nonBlank = (message: string) =>
  z.string().refine((value) => value.trim().length > 0, { error: message });

const gateMode = z.enum(["none", "and", "xor"]);
const spanKind = z.enum(["active", "wait"]);
const toolHold = z.enum(["active", "span"]);

const spanWrite = z.object({
  ord: z.number().int().nonnegative(),
  kind: spanKind,
  seconds: z.number().int().nonnegative(),
});

const nodeIngredientWrite = z.object({
  ingredientId: z.number().int().positive().describe("Catalog ingredient id"),
  qty: z.number().nonnegative().nullable().optional(),
  unit: z.string().nullable().optional(),
  optional: z.boolean().optional(),
});

const nodeToolWrite = z.object({
  toolId: z.number().int().positive().describe("Catalog tool id"),
  optional: z.boolean().optional(),
  hold: toolHold.optional().describe("active during the step, or span for the timed span"),
});

const nodeWrite = z.object({
  key: nonBlank("step key must not be blank").describe("Stable step key. Comments use this key"),
  title: nonBlank("step title must not be blank"),
  body: z.string().optional().describe("Step method. Not notes"),
  branchMode: gateMode
    .optional()
    .describe("none with 0 or 1 outgoing edge; and or xor when there are more"),
  joinMode: gateMode
    .optional()
    .describe("none with 0 or 1 incoming edge; and or xor when there are more"),
  repeatMin: z.number().int().positive().optional(),
  repeatMax: z.number().int().positive().optional(),
  ord: z.number().int().nonnegative().optional(),
  spans: z.array(spanWrite).optional(),
  ingredients: z.array(nodeIngredientWrite).optional(),
  tools: z.array(nodeToolWrite).optional(),
});

const edgeWrite = z.object({
  from: nonBlank("edge from must not be blank"),
  to: nonBlank("edge to must not be blank"),
  label: z.string().optional(),
});

const ingredientAltWrite = z.object({
  ingredientId: z.number().int().positive(),
  altIngredientId: z.number().int().positive(),
  nodeKey: z.string().nullable().optional().describe("Null applies to the whole recipe"),
  ratio: z.number().positive().optional(),
  note: z.string().optional(),
});

const toolAltWrite = z.object({
  toolId: z.number().int().positive(),
  altToolId: z.number().int().positive(),
  nodeKey: z.string().nullable().optional().describe("Null applies to the whole recipe"),
  note: z.string().optional(),
});

export const emptySchema = z.object({});

export const namedWriteSchema = z.object({
  slug,
  name: nonBlank("name must not be blank"),
});

export const recipeIdSchema = z.object({
  recipeId: z.number().int().positive().describe("Recipe id"),
});

export const recipeWriteSchema = z.object({
  title: nonBlank("title must not be blank"),
  description: z.string().optional().describe("Method intro"),
  notes: z.string().optional().describe("Cook's notes for the whole recipe. Not a thread"),
  cooks: z.number().int().positive().optional(),
  visibility: z.enum(["public", "private"]).optional(),
  nodes: z.array(nodeWrite).min(1),
  edges: z.array(edgeWrite).optional(),
  ingredientAlts: z.array(ingredientAltWrite).optional(),
  toolAlts: z.array(toolAltWrite).optional(),
});

export const updateRecipeSchema = recipeWriteSchema.extend({
  recipeId: z.number().int().positive().describe("Recipe id"),
});

export const commentSchema = z.object({
  recipeId: z.number().int().positive().describe("Recipe id"),
  stepKey: nonBlank("stepKey must not be blank").describe("Node key on the recipe"),
  body: nonBlank("body must not be blank"),
});

export type RecipeWrite = z.infer<typeof recipeWriteSchema>;

type NodeWrite = RecipeWrite["nodes"][number];

export type RecipeBody = {
  title: string;
  description: string;
  notes: string;
  cooks: number;
  visibility: "public" | "private";
  nodes: Array<{
    key: string;
    title: string;
    body: string;
    branchMode: "none" | "and" | "xor";
    joinMode: "none" | "and" | "xor";
    repeatMin: number;
    repeatMax: number;
    ord: number;
    spans: Array<{ ord: number; kind: "active" | "wait"; seconds: number }>;
    ingredients: Array<{
      ingredientId: number;
      qty?: number;
      unit?: string;
      optional: boolean;
    }>;
    tools: Array<{
      toolId: number;
      optional: boolean;
      hold: "active" | "span";
    }>;
  }>;
  edges: Array<{ from: string; to: string; label: string }>;
  ingredientAlts: Array<{
    ingredientId: number;
    altIngredientId: number;
    nodeKey?: string;
    ratio: number;
    note: string;
  }>;
  toolAlts: Array<{
    toolId: number;
    altToolId: number;
    nodeKey?: string;
    note: string;
  }>;
};

function nodePayload(node: NodeWrite): RecipeBody["nodes"][number] {
  return {
    key: node.key,
    title: node.title,
    body: node.body ?? "",
    branchMode: node.branchMode ?? "none",
    joinMode: node.joinMode ?? "none",
    repeatMin: node.repeatMin ?? 1,
    repeatMax: node.repeatMax ?? 1,
    ord: node.ord ?? 0,
    spans: node.spans ?? [],
    ingredients: (node.ingredients ?? []).map((item) => ({
      ingredientId: item.ingredientId,
      ...(item.qty != null ? { qty: item.qty } : {}),
      ...(item.unit != null && item.unit !== "" ? { unit: item.unit } : {}),
      optional: item.optional ?? false,
    })),
    tools: (node.tools ?? []).map((item) => ({
      toolId: item.toolId,
      optional: item.optional ?? false,
      hold: item.hold ?? "active",
    })),
  };
}

export function recipePayload(recipe: RecipeWrite): RecipeBody {
  return {
    title: recipe.title,
    description: recipe.description ?? "",
    notes: recipe.notes ?? "",
    cooks: recipe.cooks ?? 1,
    visibility: recipe.visibility ?? "public",
    nodes: recipe.nodes.map(nodePayload),
    edges: (recipe.edges ?? []).map((edge) => ({
      from: edge.from,
      to: edge.to,
      label: edge.label ?? "",
    })),
    ingredientAlts: (recipe.ingredientAlts ?? []).map((alt) => ({
      ingredientId: alt.ingredientId,
      altIngredientId: alt.altIngredientId,
      ...(alt.nodeKey != null && alt.nodeKey !== "" ? { nodeKey: alt.nodeKey } : {}),
      ratio: alt.ratio ?? 1,
      note: alt.note ?? "",
    })),
    toolAlts: (recipe.toolAlts ?? []).map((alt) => ({
      toolId: alt.toolId,
      altToolId: alt.altToolId,
      ...(alt.nodeKey != null && alt.nodeKey !== "" ? { nodeKey: alt.nodeKey } : {}),
      note: alt.note ?? "",
    })),
  };
}
