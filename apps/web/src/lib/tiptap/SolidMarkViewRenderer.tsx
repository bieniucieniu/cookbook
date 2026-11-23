import type { MarkViewProps, MarkViewRenderer, MarkViewRendererOptions } from "@tiptap/core";
import { MarkView } from "@tiptap/core";
import { type ComponentProps, dynamic } from "@solidjs/web";
import { type Component, createContext, omit, useContext } from "solid-js";

import { SolidRenderer } from "./SolidRenderer";

export interface MarkViewContextProps {
  markViewContentRef: (element: HTMLElement | null) => void;
}

export const SolidMarkViewContext = createContext<MarkViewContextProps>({
  markViewContentRef: () => {
    // do nothing
  },
});

export type MarkViewContentProps = {
  as?: string;
} & ComponentProps<"span">;

export const MarkViewContent = (props: MarkViewContentProps) => {
  const rest = omit(props, "as");
  const ctx = useContext(SolidMarkViewContext);

  const Tag = dynamic(() => props.as || "span");
  // The renderer and the caller both need the element; pass both refs (see NodeViewContent).
  return <Tag {...rest} ref={[ctx.markViewContentRef, props.ref]} data-mark-view-content="" />;
};

export interface SolidMarkViewRendererOptions extends MarkViewRendererOptions {
  as?: string;
  className?: string;
  attrs?: { [key: string]: string };
}

export class SolidMarkView extends MarkView<
  Component<MarkViewProps>,
  SolidMarkViewRendererOptions
> {
  renderer: SolidRenderer<MarkViewProps>;
  contentDOMElement: HTMLElement;

  constructor(
    component: Component<MarkViewProps>,
    props: MarkViewProps,
    options?: Partial<SolidMarkViewRendererOptions>
  ) {
    super(component, props, options);

    const { as = "span", attrs, className = "" } = options || {};
    const componentProps = {
      ...props,
      updateAttributes: this.updateAttributes.bind(this),
    } satisfies MarkViewProps;

    this.contentDOMElement = document.createElement("span");

    const markViewContentRef: MarkViewContextProps["markViewContentRef"] = (el) => {
      if (el && !el.contains(this.contentDOMElement)) {
        el.appendChild(this.contentDOMElement);
      }
    };

    const SolidMarkViewProvider: Component<MarkViewProps> = (props) => {
      return (
        <SolidMarkViewContext value={{ markViewContentRef }}>
          <this.component {...props} />
        </SolidMarkViewContext>
      );
    };

    this.renderer = new SolidRenderer(SolidMarkViewProvider, {
      editor: props.editor,
      props: componentProps,
      as,
      className: `mark-${props.mark.type.name} ${className}`.trim(),
    });

    if (attrs) {
      this.renderer.updateAttributes(attrs);
    }
  }

  get dom() {
    return this.renderer.element;
  }

  get contentDOM() {
    return this.contentDOMElement;
  }
}

export function SolidMarkViewRenderer(
  component: Component<MarkViewProps>,
  options: Partial<SolidMarkViewRendererOptions> = {}
): MarkViewRenderer {
  return (props) => new SolidMarkView(component, props, options);
}
