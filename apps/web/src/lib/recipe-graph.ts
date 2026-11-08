import type { NodeWriteBranchMode, NodeWriteJoinMode } from "@/generated/model";

export type GraphNode = { key: string; ord: number; branchMode: NodeWriteBranchMode };
export type GraphEdge = { from: string; to: string };

export type GraphIssue = {
  nodeKey: string;
  issue: "cycle" | "open-split" | "join-without-split";
};

const issueText: Record<GraphIssue["issue"], string> = {
  cycle: "Loops back",
  "open-split": "Arms never meet",
  "join-without-split": "No matching split",
};

export function issueLabel(issue: GraphIssue["issue"]): string {
  return issueText[issue];
}

export const columnWidth = 240;
export const rowHeight = 120;

function adjacency(keys: string[], edges: GraphEdge[]) {
  const known = new Set(keys);
  const next = new Map<string, string[]>(keys.map((key) => [key, []]));
  const prev = new Map<string, string[]>(keys.map((key) => [key, []]));
  for (const edge of edges) {
    if (!known.has(edge.from) || !known.has(edge.to) || edge.from === edge.to) continue;
    next.get(edge.from)?.push(edge.to);
    prev.get(edge.to)?.push(edge.from);
  }
  return { next, prev };
}

/** Longest-path depth from the roots. Nodes on a cycle get no rank and land after the rest. */
export function ranks(
  keys: string[],
  edges: GraphEdge[]
): { rank: Map<string, number>; cyclic: Set<string> } {
  const { next, prev } = adjacency(keys, edges);
  const indegree = new Map(keys.map((key) => [key, prev.get(key)?.length ?? 0]));
  const rank = new Map<string, number>();
  const queue = keys.filter((key) => indegree.get(key) === 0);
  for (const key of queue) rank.set(key, 0);
  for (let index = 0; index < queue.length; index += 1) {
    const key = queue[index];
    if (key === undefined) continue;
    for (const target of next.get(key) ?? []) {
      rank.set(target, Math.max(rank.get(target) ?? 0, (rank.get(key) ?? 0) + 1));
      const left = (indegree.get(target) ?? 1) - 1;
      indegree.set(target, left);
      if (left === 0) queue.push(target);
    }
  }
  const cyclic = new Set(keys.filter((key) => (indegree.get(key) ?? 0) > 0));
  const deepest = Math.max(-1, ...rank.values());
  for (const key of cyclic) rank.set(key, deepest + 1);
  return { rank, cyclic };
}

/** Steps grouped by depth, each group in `ord` order. Same group = may run side by side. */
export function lanes<T extends { key: string; ord: number }>(
  nodes: T[],
  edges: GraphEdge[]
): T[][] {
  const { rank } = ranks(
    nodes.map((node) => node.key),
    edges
  );
  const groups = new Map<number, T[]>();
  for (const node of [...nodes].sort((left, right) => left.ord - right.ord)) {
    const depth = rank.get(node.key) ?? 0;
    const group = groups.get(depth) ?? [];
    group.push(node);
    groups.set(depth, group);
  }
  return [...groups.entries()].sort(([left], [right]) => left - right).map(([, group]) => group);
}

export function layout(
  nodes: { key: string; ord: number }[],
  edges: GraphEdge[]
): Map<string, { x: number; y: number }> {
  const position = new Map<string, { x: number; y: number }>();
  lanes(nodes, edges).forEach((group, depth) => {
    const offset = ((group.length - 1) * rowHeight) / 2;
    group.forEach((node, index) => {
      position.set(node.key, { x: depth * columnWidth, y: index * rowHeight - offset });
    });
  });
  return position;
}

function ancestors(key: string, prev: Map<string, string[]>): Set<string> {
  const seen = new Set<string>([key]);
  const stack = [key];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    for (const parent of prev.get(current) ?? []) {
      if (seen.has(parent)) continue;
      seen.add(parent);
      stack.push(parent);
    }
  }
  return seen;
}

/** The deepest split that every arm entering `joinKey` comes from. */
function splitFor(
  joinKey: string,
  next: Map<string, string[]>,
  prev: Map<string, string[]>,
  rank: Map<string, number>
): string | undefined {
  const parents = prev.get(joinKey) ?? [];
  if (parents.length < 2) return undefined;
  const [first, ...rest] = parents.map((parent) => ancestors(parent, prev));
  if (!first) return undefined;
  const common = [...first].filter(
    (key) => rest.every((set) => set.has(key)) && (next.get(key)?.length ?? 0) > 1
  );
  common.sort((left, right) => (rank.get(right) ?? 0) - (rank.get(left) ?? 0));
  return common[0];
}

/**
 * Modes follow degree (docs/recipes.md): out-degree > 1 is a split, in-degree > 1 is a join.
 * The cook only picks `and` / `xor` on a split. Its join takes the same mode.
 */
export function deriveModes(
  nodes: GraphNode[],
  edges: GraphEdge[]
): Map<string, { branchMode: NodeWriteBranchMode; joinMode: NodeWriteJoinMode }> {
  const keys = nodes.map((node) => node.key);
  const { next, prev } = adjacency(keys, edges);
  const { rank } = ranks(keys, edges);
  const chosen = new Map(nodes.map((node) => [node.key, node.branchMode]));
  const modes = new Map<string, { branchMode: NodeWriteBranchMode; joinMode: NodeWriteJoinMode }>();
  for (const key of keys) {
    const out = next.get(key)?.length ?? 0;
    const picked = chosen.get(key);
    const branchMode: NodeWriteBranchMode = out > 1 ? (picked === "xor" ? "xor" : "and") : "none";
    modes.set(key, { branchMode, joinMode: "none" });
  }
  for (const key of keys) {
    if ((prev.get(key)?.length ?? 0) < 2) continue;
    const split = splitFor(key, next, prev, rank);
    const mode = split ? (modes.get(split)?.branchMode ?? "and") : "and";
    const current = modes.get(key);
    if (current) current.joinMode = mode === "none" ? "and" : mode;
  }
  return modes;
}

export function validateGraph(nodes: GraphNode[], edges: GraphEdge[]): GraphIssue[] {
  const keys = nodes.map((node) => node.key);
  const { next, prev } = adjacency(keys, edges);
  const { rank, cyclic } = ranks(keys, edges);
  const issues: GraphIssue[] = [...cyclic].map((nodeKey) => ({ nodeKey, issue: "cycle" }));
  if (cyclic.size > 0) return issues;
  const closed = new Set<string>();
  for (const key of keys) {
    if ((prev.get(key)?.length ?? 0) < 2) continue;
    const split = splitFor(key, next, prev, rank);
    if (split) closed.add(split);
    else issues.push({ nodeKey: key, issue: "join-without-split" });
  }
  for (const key of keys) {
    if ((next.get(key)?.length ?? 0) > 1 && !closed.has(key)) {
      issues.push({ nodeKey: key, issue: "open-split" });
    }
  }
  return issues;
}

export function leaves(keys: string[], edges: GraphEdge[]): string[] {
  const { next } = adjacency(keys, edges);
  return keys.filter((key) => (next.get(key)?.length ?? 0) === 0);
}

/** Edges for a new step: from every current leaf, so open arms join here. */
export function autoWire(keys: string[], edges: GraphEdge[], newKey: string): GraphEdge[] {
  return leaves(
    keys.filter((key) => key !== newKey),
    edges
  ).map((from) => ({ from, to: newKey }));
}

export function outgoing(key: string, edges: GraphEdge[]): string[] {
  return edges.filter((edge) => edge.from === key).map((edge) => edge.to);
}

export function incoming(key: string, edges: GraphEdge[]): string[] {
  return edges.filter((edge) => edge.to === key).map((edge) => edge.from);
}
