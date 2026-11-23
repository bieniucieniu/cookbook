import type { Editor } from "@tiptap/core";
import { type Component } from "solid-js";
import type { Accessor } from "solid-js";

export type AnyProps = Record<string, any>;

export type ContentRenderer<P extends AnyProps = AnyProps> = {
  id: string;
  element: HTMLElement;
  component: Component<P>;
  props: P;
};

export type EditorWithContentComponent<P extends AnyProps = AnyProps> = Editor & {
  contentComponent?: ContentComponent<P> | null;
  isEditorContentInitialized?: boolean;
};

export type ContentComponent<P extends AnyProps = AnyProps> = {
  setRenderer(id: string, renderer: ContentRenderer<P>): void;
  removeRenderer(id: string): void;
  /** The mounted renderers, in insertion order. A signal, so renderer objects stay unproxied. */
  renderers: Accessor<readonly ContentRenderer<P>[]>;
};
