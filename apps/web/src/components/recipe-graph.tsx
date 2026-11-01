import { Flow, Position, createFlow, type FlowEdge, type FlowNode } from "@/components/xyflow";
import "@/components/xyflow/style.css";
import type { CommentResponse, RecipeDetail } from "@/generated/model";
import { createMemo, For, Show } from "solid-js";

const columnWidth = 220;
const rowHeight = 100;

export function RecipeGraph(props: { recipe: RecipeDetail }) {
  const laidOut = createMemo(() => layoutGraph(props.recipe));
  const flow = createFlow(() => ({
    nodes: laidOut().nodes,
    edges: laidOut().edges,
    fitView: true,
    nodesDraggable: false,
    nodesConnectable: false,
    elementsSelectable: true,
  }));
  const selected = createMemo(() => flow.nodes.find((node) => node.selected));
  const step = createMemo(() => {
    const key = selected()?.id;
    return props.recipe.nodes.find((node) => node.key === key);
  });
  const comments = createMemo(() => {
    const key = step()?.key;
    if (!key) return [];
    return (props.recipe.comments ?? []).filter((comment) => comment.stepKey === key);
  });

  return (
    <div class="flex flex-col gap-3">
      <Flow flow={flow} class="rounded-lg ring-1 ring-foreground/10" style={{ height: "28rem" }} />
      <Show when={step()} fallback={<p class="text-xs text-muted-foreground">Select a step.</p>}>
        {(node) => (
          <section class="flex flex-col gap-2">
            <h2 class="text-sm font-medium">{node().title}</h2>
            <Show when={node().body}>
              <p class="text-xs text-muted-foreground">{node().body}</p>
            </Show>
            <For each={comments()}>{(comment) => <CommentLine comment={comment} />}</For>
          </section>
        )}
      </Show>
    </div>
  );
}

function CommentLine(props: { comment: CommentResponse }) {
  return (
    <article class="flex flex-col gap-0.5">
      <p class="text-xs text-muted-foreground">
        {props.comment.email} · {formatTime(props.comment.createdAt)}
      </p>
      <p class="text-xs">{props.comment.body}</p>
    </article>
  );
}

function formatTime(seconds: number): string {
  return new Date(seconds * 1000).toLocaleString();
}

function layoutGraph(recipe: RecipeDetail): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const keyById = new Map(recipe.nodes.map((node) => [node.id, node.key]));
  const edges: FlowEdge[] = recipe.edges.flatMap((edge) => {
    const source = keyById.get(edge.fromNodeId);
    const target = keyById.get(edge.toNodeId);
    if (!source || !target) return [];
    return [
      {
        id: `${source}->${target}:${edge.label}`,
        source,
        target,
        label: edge.label || undefined,
      },
    ];
  });
  const rank = ranks(
    recipe.nodes.map((node) => node.key),
    edges.map((edge) => ({ source: edge.source, target: edge.target }))
  );
  const columns = new Map<number, string[]>();
  for (const node of [...recipe.nodes].sort((left, right) => left.ord - right.ord)) {
    const depth = rank.get(node.key) ?? 0;
    const column = columns.get(depth) ?? [];
    column.push(node.key);
    columns.set(depth, column);
  }
  const position = new Map<string, { x: number; y: number }>();
  for (const [depth, keys] of columns) {
    keys.forEach((key, index) => {
      position.set(key, { x: depth * columnWidth, y: index * rowHeight });
    });
  }
  const nodes: FlowNode[] = recipe.nodes.map((node) => ({
    id: node.key,
    position: position.get(node.key) ?? { x: 0, y: 0 },
    data: { label: node.title },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    draggable: false,
    connectable: false,
  }));
  return { nodes, edges };
}

function ranks(keys: string[], edges: { source: string; target: string }[]): Map<string, number> {
  const indegree = new Map(keys.map((key) => [key, 0]));
  const next = new Map<string, string[]>();
  for (const edge of edges) {
    if (!indegree.has(edge.source) || !indegree.has(edge.target)) continue;
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
    const list = next.get(edge.source) ?? [];
    list.push(edge.target);
    next.set(edge.source, list);
  }
  const rank = new Map<string, number>();
  let frontier = keys.filter((key) => indegree.get(key) === 0);
  let depth = 0;
  const seen = new Set<string>();
  while (frontier.length > 0 && depth <= keys.length) {
    const following: string[] = [];
    for (const key of frontier) {
      if (seen.has(key)) continue;
      seen.add(key);
      rank.set(key, depth);
      for (const target of next.get(key) ?? []) {
        const left = (indegree.get(target) ?? 1) - 1;
        indegree.set(target, left);
        if (left === 0) following.push(target);
      }
    }
    frontier = following;
    depth += 1;
  }
  for (const key of keys) {
    if (!rank.has(key)) rank.set(key, depth);
  }
  return rank;
}
