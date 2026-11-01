import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { api } from "./api.ts";
import {
  commentSchema,
  emptySchema,
  namedWriteSchema,
  recipeIdSchema,
  recipePayload,
  recipeWriteSchema,
  updateRecipeSchema,
} from "./schema.ts";

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

async function call(action: () => Promise<unknown>): Promise<ToolResult> {
  try {
    const value = await action();
    return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return { isError: true, content: [{ type: "text", text: message }] };
  }
}

const recipeHelp =
  "nodes[].body is the step method. Step notes are comments, not a node field. Do not send photos; images stay a browser upload. One start step and one end step. branchMode and joinMode are none when that side has at most one edge, otherwise and or xor.";

function createServer(): McpServer {
  const server = new McpServer({ name: "cookbook", version: "0.0.0" });

  server.registerTool(
    "list_ingredients",
    {
      description: "List catalog ingredients (id, slug, name, allergenIds, alts).",
      inputSchema: emptySchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => call(() => api("GET", "/ingredients"))
  );

  server.registerTool(
    "list_tools",
    {
      description: "List catalog tools (id, slug, name, alts).",
      inputSchema: emptySchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => call(() => api("GET", "/tools"))
  );

  server.registerTool(
    "list_allergens",
    {
      description: "List catalog allergens (id, slug, name).",
      inputSchema: emptySchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => call(() => api("GET", "/allergens"))
  );

  server.registerTool(
    "create_ingredient",
    {
      description: "Create a catalog ingredient. slug is lowercase words joined by hyphens.",
      inputSchema: namedWriteSchema,
      annotations: { openWorldHint: true },
    },
    async (input) => call(() => api("POST", "/ingredients", input))
  );

  server.registerTool(
    "create_tool",
    {
      description: "Create a catalog tool. slug is lowercase words joined by hyphens.",
      inputSchema: namedWriteSchema,
      annotations: { openWorldHint: true },
    },
    async (input) => call(() => api("POST", "/tools", input))
  );

  server.registerTool(
    "create_allergen",
    {
      description: "Create a catalog allergen. slug is lowercase words joined by hyphens.",
      inputSchema: namedWriteSchema,
      annotations: { openWorldHint: true },
    },
    async (input) => call(() => api("POST", "/allergens", input))
  );

  server.registerTool(
    "create_recipe",
    {
      description: `Create a recipe. ${recipeHelp}`,
      inputSchema: recipeWriteSchema,
      annotations: { openWorldHint: true },
    },
    async (recipe) => call(() => api("POST", "/recipes", recipePayload(recipe)))
  );

  server.registerTool(
    "get_recipe",
    {
      description: "Fetch one recipe by id.",
      inputSchema: recipeIdSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ recipeId }) => call(() => api("GET", `/recipes/${recipeId}`))
  );

  server.registerTool(
    "update_recipe",
    {
      description: `Replace a recipe. Same fields as create_recipe, plus recipeId. ${recipeHelp}`,
      inputSchema: updateRecipeSchema,
      annotations: { destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ recipeId, ...recipe }) =>
      call(() => api("PUT", `/recipes/${recipeId}`, recipePayload(recipe)))
  );

  server.registerTool(
    "add_step_comment",
    {
      description:
        "Add a comment on a recipe step. stepKey is the node key. Posted as the agent user.",
      inputSchema: commentSchema,
      annotations: { openWorldHint: true },
    },
    async ({ recipeId, stepKey, body }) =>
      call(() => api("POST", `/recipes/${recipeId}/comments`, { stepKey, body }))
  );

  return server;
}

const server = createServer();
const transport = new StdioServerTransport();
await server.connect(transport);
