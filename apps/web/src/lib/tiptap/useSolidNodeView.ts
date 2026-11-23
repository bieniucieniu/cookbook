import { type JSX } from "@solidjs/web";
import { createContext, useContext } from "solid-js";

export interface SolidNodeViewContextProps {
  onDragStart?: (event: DragEvent) => void;
  nodeViewContentRef?: (element: HTMLElement | null) => void;
  /**
   * This allows you to add children into the NodeViewContent component.
   * This is useful when statically rendering the content of a node view.
   */
  nodeViewContentChildren?: JSX.Element;
}

export const SolidNodeViewContext = createContext<SolidNodeViewContextProps>({
  onDragStart: () => {
    // no-op
  },
  nodeViewContentChildren: undefined,
  nodeViewContentRef: () => {
    // no-op
  },
});

export const useSolidNodeView = () => useContext(SolidNodeViewContext);
