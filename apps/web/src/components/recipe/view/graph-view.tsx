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
import type { RecipeDraft } from "@/lib/recipe-draft";
import { stepNumbers } from "@/lib/recipe-graph";
import { createMemo, createSignal, onCleanup, onMount, Show, type JSX } from "solid-js";
import { RecipeFlow } from "../recipe-flow";
import { StepCard } from "./step-card";

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
 * Read-only graph. A selected step opens as the same card the list view shows: in a supporting
 * pane beside the graph from the expanded breakpoint up, and in a bottom sheet below that.
 */
export function GraphView(props: {
  draft: RecipeDraft;
  catalog: Catalog;
  cooks: number;
  stepFooter?: (stepKey: string) => JSX.Element;
}) {
  const wide = useWide();
  const [selected, setSelected] = createSignal<string>();
  const step = createMemo(() => props.draft.nodes.find((node) => node.key === selected()));
  const numbers = createMemo(() => stepNumbers(props.draft.nodes, props.draft.edges));

  return (
    <div class="grid gap-4 expanded:grid-cols-[1fr_24rem]">
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
                      <BottomSheetTitle class="sr-only">{node().title}</BottomSheetTitle>
                      <BottomSheetBody>
                        <StepCard
                          node={node()}
                          number={numbers().get(node().key)}
                          catalog={props.catalog}
                          draftCooks={props.draft.cooks}
                          cooks={props.cooks}
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
        <aside class="self-start" aria-label="Selected step">
          <Show
            when={step()}
            fallback={
              <p class="rounded-large bg-surface-container-low p-4 typescale-body-medium text-on-surface-variant">
                Tap a step to see what it needs.
              </p>
            }
          >
            {(node) => (
              <StepCard
                node={node()}
                number={numbers().get(node().key)}
                catalog={props.catalog}
                draftCooks={props.draft.cooks}
                cooks={props.cooks}
                footer={props.stepFooter?.(node().key)}
              />
            )}
          </Show>
        </aside>
      </Show>
    </div>
  );
}
