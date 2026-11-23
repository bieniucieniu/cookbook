import type { Editor } from "@tiptap/core";
import { type Component } from "solid-js";
import { createStore } from "solid-js";

import type { AnyProps, EditorWithContentComponent } from "./editor";

export interface SolidRendererOptions {
  editor: Editor;
  props?: Record<string, any>;
  as?: string;
  className?: string;
}

export class SolidRenderer<P extends AnyProps = AnyProps> {
  id: string;

  editor: EditorWithContentComponent<P>;

  component: Component<P>;

  element: HTMLElement;

  props: P;

  setProps: (props: Partial<P>) => void;

  /**
   * Flag to track if the renderer has been destroyed.
   */
  destroyed = false;

  constructor(
    component: Component<P>,
    { editor, props = {}, as = "div", className = "" }: SolidRendererOptions
  ) {
    this.id = Math.floor(Math.random() * 0xffffffff).toString();
    this.component = component;
    this.editor = editor;

    const [store, setStore] = createStore<AnyProps>({ ...props });
    this.props = store as P;
    // Merge like Tiptap React: a partial update (e.g. `{ selected: true }`) keeps the other props.
    this.setProps = (newProps: Partial<P>) =>
      setStore((draft) => {
        Object.assign(draft, newProps);
      });

    this.element = document.createElement(as);
    this.element.classList.add("solid-renderer");

    if (className) {
      this.element.classList.add(...className.split(" "));
    }

    this.render();
  }

  render(): void {
    if (this.destroyed) {
      return;
    }

    this.editor?.contentComponent?.setRenderer(this.id, this);
  }

  updateProps(props: Partial<P> = {}): void {
    if (this.destroyed) {
      return;
    }

    this.setProps(props);
  }

  destroy(): void {
    this.destroyed = true;
    this.editor?.contentComponent?.removeRenderer(this.id);

    try {
      if (this.element?.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
    } catch {
      // ignore DOM removal errors
    }
  }

  updateAttributes(attributes: Record<string, string>): void {
    Object.keys(attributes).forEach((key) => {
      this.element.setAttribute(key, attributes[key]);
    });
  }
}
