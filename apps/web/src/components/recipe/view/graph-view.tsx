import { IconCarrot } from "@/components/icons";
import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetDragHandle,
  BottomSheetOverlay,
  BottomSheetPortal,
  BottomSheetTitle,
} from "@/components/m3/bottom-sheet";
import type { Catalog } from "@/lib/catalog";
import type { DraftNode, RecipeDraft } from "@/lib/recipe-draft";
import { createMemo, createSignal, For, onCleanup, onMount, Show, type JSX } from "solid-js";
import { MarkdownView } from "../markdown";
import { ItemChip, SpanBadge } from "../parts";
import { RecipeFlow } from "../recipe-flow";

function useWide(): () => boolean {
  // M3 expanded breakpoint (840px): two panes from here up.
  const query = window.matchMedia("(min-width: 840px)");
  const [wide, setWide] = createSignal(query.matches);
  onMount(() => {
    const listener = (event: MediaQueryListEvent) => setWide(event.matches);
    query.addEventListener("change", listener);
    onCleanup(() => query.removeEventListener("change", listener));
  });
  return wide;
}

/**
 * Read-only graph. A selected step opens in a supporting pane beside it from the expanded
 * breakpoint up, and in a bottom sheet below that.
 */
export function GraphView(props: {
  draft: RecipeDraft;
  catalog: Catalog;
  stepFooter?: (stepKey: string) => JSX.Element;
}) {
  const wide = useWide();
  const [selected, setSelected] = createSignal<string>();
  const step = createMemo(() => props.draft.nodes.find((node) => node.key === selected()));

  return (
    <div class="grid gap-4 expanded:grid-cols-[1fr_22rem]">
      <RecipeFlow draft={props.draft} class="h-[65vh] min-h-80" onSelect={setSelected} />
      <Show
        when={wide()}
        fallback={
          <BottomSheet
            open={step() !== undefined}
            onOpenChange={(open) => !open && setSelected(undefined)}
          >
            <BottomSheetPortal>
              <BottomSheetOverlay />
              <BottomSheetContent>
                <BottomSheetDragHandle />
                <Show when={step()}>
                  {(node) => (
                    <>
                      <BottomSheetTitle class="pb-3">{node().title}</BottomSheetTitle>
                      <BottomSheetBody>
                        <StepDetail
                          node={node()}
                          catalog={props.catalog}
                          footer={props.stepFooter?.(node().key)}
                        />
                      </BottomSheetBody>
                    </>
                  )}
                </Show>
              </BottomSheetContent>
            </BottomSheetPortal>
          </BottomSheet>
        }
      >
        <aside class="flex flex-col gap-3 self-start rounded-large bg-surface-container-low p-4">
          <Show
            when={step()}
            fallback={
              <p class="typescale-body-medium text-on-surface-variant">
                Tap a step to see what it needs.
              </p>
            }
          >
            {(node) => (
              <>
                <h2 class="typescale-title-large text-on-surface">{node().title}</h2>
                <StepDetail
                  node={node()}
                  catalog={props.catalog}
                  footer={props.stepFooter?.(node().key)}
                />
              </>
            )}
          </Show>
        </aside>
      </Show>
    </div>
  );
}

function StepDetail(props: { node: DraftNode; catalog: Catalog; footer?: JSX.Element }) {
  return (
    <div class="flex flex-col gap-3">
      <Show
        when={props.node.ingredients.length + props.node.tools.length + props.node.spans.length > 0}
        fallback={
          <span class="inline-flex items-center gap-1.5 typescale-body-medium text-on-surface-variant">
            <IconCarrot size={16} aria-hidden="true" />
            Nothing listed
          </span>
        }
      >
        <div class="flex flex-wrap gap-2">
          <For each={props.node.ingredients}>
            {(item) => (
              <ItemChip
                kind="ingredient"
                name={props.catalog.name("ingredient", item.ingredientId)}
                qty={item.qty}
                unit={item.unit}
                optional={item.optional}
                static
              />
            )}
          </For>
          <For each={props.node.tools}>
            {(item) => (
              <ItemChip kind="tool" name={props.catalog.name("tool", item.toolId)} static />
            )}
          </For>
          <For each={props.node.spans}>
            {(span) => <SpanBadge kind={span.kind} seconds={span.seconds} static />}
          </For>
        </div>
      </Show>
      <Show when={props.node.body.trim()}>
        <MarkdownView value={props.node.body} />
      </Show>
      {props.footer}
    </div>
  );
}
