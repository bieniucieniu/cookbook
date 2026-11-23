import type {
  DecorationWithType,
  Editor,
  NodeViewRenderer,
  NodeViewRendererOptions,
  NodeViewRendererProps,
} from "@tiptap/core";
import { getRenderedAttributes, isNodeViewSelected, NodeView } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type {
  Decoration,
  DecorationSource,
  NodeView as ProseMirrorNodeView,
} from "@tiptap/pm/view";
import { type Component } from "solid-js";

import type { EditorWithContentComponent } from "./editor";
import { SolidRenderer } from "./SolidRenderer";
import type { SolidNodeViewProps } from "./types";
import { SolidNodeViewContext } from "./useSolidNodeView";

export interface SolidNodeViewRendererOptions extends NodeViewRendererOptions {
  update:
    | ((props: {
        oldNode: ProseMirrorNode;
        oldDecorations: readonly Decoration[];
        oldInnerDecorations: DecorationSource;
        newNode: ProseMirrorNode;
        newDecorations: readonly Decoration[];
        innerDecorations: DecorationSource;
        updateProps: () => void;
      }) => boolean)
    | null;
  as?: string;
  className?: string;
  attrs?:
    | Record<string, string>
    | ((props: {
        node: ProseMirrorNode;
        HTMLAttributes: Record<string, any>;
      }) => Record<string, string>);
}

export class SolidNodeView<
  T = HTMLElement,
  NodeEditor extends Editor = Editor,
  Options extends SolidNodeViewRendererOptions = SolidNodeViewRendererOptions,
> extends NodeView<Component<SolidNodeViewProps<T>>, NodeEditor, Options> {
  // `NodeView`'s constructor calls `mount()` before subclass fields initialize, so fields
  // that `mount()` sets are `declare`d: a field definition would reset them after `super()`.
  declare renderer: SolidRenderer<SolidNodeViewProps<T>>;

  declare contentDOMElement: HTMLElement | null;

  selectionRafId: number | null = null;

  declare private currentPos: number | undefined;

  private handlePositionUpdate = () => {
    const newPos = this.getPos();

    if (typeof newPos !== "number" || newPos === this.currentPos) {
      return;
    }

    this.currentPos = newPos;
    this.renderer.updateProps({ getPos: () => this.getPos() });

    if (typeof this.options.attrs === "function") {
      this.updateElementAttributes();
    }
  };

  constructor(
    component: Component<SolidNodeViewProps<T>>,
    props: NodeViewRendererProps,
    options?: Partial<Options>
  ) {
    super(component, props, options);

    if (!this.node.isLeaf) {
      if (this.options.contentDOMElementTag) {
        this.contentDOMElement = document.createElement(this.options.contentDOMElementTag);
      } else {
        this.contentDOMElement = document.createElement(this.node.isInline ? "span" : "div");
      }

      this.contentDOMElement.dataset.nodeViewContentSolid = "";
      this.contentDOMElement.dataset.nodeViewWrapper = "";
      this.contentDOMElement.style.whiteSpace = "inherit";

      const contentTarget = this.dom.querySelector("[data-node-view-content]");

      if (!contentTarget) {
        return;
      }

      contentTarget.appendChild(this.contentDOMElement);
    }

    if (this.options.trackNodeViewPosition) {
      this.editor.on("update", this.handlePositionUpdate);
    }
  }

  declare private cachedExtensionWithSyncedStorage: NodeViewRendererProps["extension"] | undefined;

  get extensionWithSyncedStorage(): NodeViewRendererProps["extension"] {
    if (!this.cachedExtensionWithSyncedStorage) {
      const editor = this.editor;
      const extension = this.extension;

      this.cachedExtensionWithSyncedStorage = new Proxy(extension, {
        get(target, prop, receiver) {
          if (prop === "storage") {
            return editor.storage[extension.name as keyof typeof editor.storage] ?? {};
          }
          return Reflect.get(target, prop, receiver);
        },
      });
    }

    return this.cachedExtensionWithSyncedStorage;
  }

  mount() {
    const onDragStart = this.onDragStart.bind(this);
    const nodeViewContentRef = (element: HTMLElement | null) => {
      if (element && this.contentDOMElement && element.firstChild !== this.contentDOMElement) {
        if (element.hasAttribute("data-node-view-wrapper")) {
          element.removeAttribute("data-node-view-wrapper");
        }
        element.appendChild(this.contentDOMElement);
      }
    };

    const SolidNodeViewProvider: Component<SolidNodeViewProps<T>> = (props) => {
      return (
        <SolidNodeViewContext value={{ onDragStart, nodeViewContentRef }}>
          <this.component {...props} />
        </SolidNodeViewContext>
      );
    };

    const props: SolidNodeViewProps<T> = {
      editor: this.editor,
      node: this.node,
      decorations: this.decorations as DecorationWithType[],
      innerDecorations: this.innerDecorations,
      view: this.view,
      selected: false,
      extension: this.extensionWithSyncedStorage,
      HTMLAttributes: this.HTMLAttributes,
      getPos: () => this.getPos(),
      updateAttributes: (attributes) => this.updateAttributes(attributes),
      deleteNode: () => this.deleteNode(),
      ref: (_: T | null) => {
        // no-op for now, but could be used to expose the element
      },
    };

    let as = this.node.isInline ? "span" : "div";

    if (this.options.as) {
      as = this.options.as;
    }

    const { className = "" } = this.options;

    this.handleSelectionUpdate = this.handleSelectionUpdate.bind(this);

    this.renderer = new SolidRenderer(SolidNodeViewProvider, {
      editor: this.editor,
      props,
      as,
      className: `node-${this.node.type.name} ${className}`.trim(),
    });

    this.editor.on("selectionUpdate", this.handleSelectionUpdate);
    this.updateElementAttributes();
    this.currentPos = this.getPos();
  }

  get dom() {
    if (
      this.renderer.element.firstElementChild &&
      !this.renderer.element.firstElementChild?.hasAttribute("data-node-view-wrapper")
    ) {
      throw Error("Please use the NodeViewWrapper component for your node view.");
    }

    return this.renderer.element;
  }

  get contentDOM() {
    if (this.node.isLeaf) {
      return null;
    }

    return this.contentDOMElement;
  }

  handleSelectionUpdate() {
    if (this.selectionRafId) {
      cancelAnimationFrame(this.selectionRafId);
      this.selectionRafId = null;
    }

    this.selectionRafId = requestAnimationFrame(() => {
      this.selectionRafId = null;
      const pos = this.currentPos;
      if (typeof pos !== "number") {
        return;
      }

      const isSelected = isNodeViewSelected({
        selection: this.editor.state.selection,
        pos,
        nodeSize: this.node.nodeSize,
        selectedOnTextSelection: this.options.selectedOnTextSelection,
      });

      if (isSelected) {
        if (this.renderer.props.selected) {
          return;
        }

        this.selectNode();
      } else {
        if (!this.renderer.props.selected) {
          return;
        }

        this.deselectNode();
      }
    });
  }

  update(
    node: ProseMirrorNode,
    decorations: readonly Decoration[],
    innerDecorations: DecorationSource
  ): boolean {
    const rerenderComponent = (props?: Partial<SolidNodeViewProps<T>>) => {
      this.renderer.updateProps(props);
      if (typeof this.options.attrs === "function") {
        this.updateElementAttributes();
      }
    };

    if (node.type !== this.node.type) {
      return false;
    }

    if (typeof this.options.update === "function") {
      const oldNode = this.node;
      const oldDecorations = this.decorations;
      const oldInnerDecorations = this.innerDecorations;

      this.node = node;
      this.decorations = decorations;
      this.innerDecorations = innerDecorations;
      this.currentPos = this.getPos();

      return this.options.update({
        oldNode,
        oldDecorations,
        newNode: node,
        newDecorations: decorations,
        oldInnerDecorations,
        innerDecorations,
        updateProps: () =>
          rerenderComponent({
            node,
            decorations: decorations as DecorationWithType[],
            innerDecorations,
            extension: this.extensionWithSyncedStorage,
          }),
      });
    }

    const nodeChanged = node !== this.node;

    if (!nodeChanged) {
      this.node = node;
      this.decorations = decorations;
      this.innerDecorations = innerDecorations;
      return true;
    }

    const newPos = this.getPos();

    this.node = node;
    this.decorations = decorations;
    this.innerDecorations = innerDecorations;
    this.currentPos = newPos;

    const extraProps: Partial<SolidNodeViewProps<T>> = {
      node,
      decorations: decorations as DecorationWithType[],
      innerDecorations,
      extension: this.extensionWithSyncedStorage,
    };

    if (this.options.trackNodeViewPosition) {
      extraProps.getPos = () => this.getPos();
    }

    rerenderComponent(extraProps);

    return true;
  }

  selectNode() {
    this.renderer.updateProps({
      selected: true,
    } as Partial<SolidNodeViewProps<T>>);
    this.renderer.element.classList.add("ProseMirror-selectednode");
  }

  deselectNode() {
    this.renderer.updateProps({
      selected: false,
    } as Partial<SolidNodeViewProps<T>>);
    this.renderer.element.classList.remove("ProseMirror-selectednode");
  }

  destroy() {
    this.renderer.destroy();
    this.editor.off("selectionUpdate", this.handleSelectionUpdate);

    if (this.options.trackNodeViewPosition) {
      this.editor.off("update", this.handlePositionUpdate);
    }

    this.contentDOMElement = null;

    if (this.selectionRafId) {
      cancelAnimationFrame(this.selectionRafId);
      this.selectionRafId = null;
    }
  }

  updateElementAttributes() {
    if (this.options.attrs) {
      let attrsObj: Record<string, string> = {};

      if (typeof this.options.attrs === "function") {
        const extensionAttributes = this.editor.extensionManager.attributes;
        const HTMLAttributes = getRenderedAttributes(this.node, extensionAttributes);

        attrsObj = this.options.attrs({ node: this.node, HTMLAttributes });
      } else {
        attrsObj = this.options.attrs;
      }

      this.renderer.updateAttributes(attrsObj);
    }
  }
}

export function SolidNodeViewRenderer<T = HTMLElement>(
  component: Component<SolidNodeViewProps<T>>,
  options?: Partial<SolidNodeViewRendererOptions>
): NodeViewRenderer {
  return (props) => {
    const editor: EditorWithContentComponent = props.editor;
    if (!editor.contentComponent) {
      return {} as unknown as ProseMirrorNodeView;
    }

    return new SolidNodeView<T>(component, props, options);
  };
}
