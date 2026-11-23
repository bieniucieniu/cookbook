import type { Editor } from "@tiptap/core";
import { type ComponentProps, Portal, dynamic } from "@solidjs/web";
import { createEffect, createSignal, For, omit } from "solid-js";
import type {
  ContentComponent,
  ContentRenderer,
  EditorWithContentComponent,
} from "@/lib/tiptap/editor";

export interface EditorContentProps extends ComponentProps<"div"> {
  editor: Editor | null;
}

function getInstance(): ContentComponent {
  // A signal of the list, not a store: a store would proxy each SolidRenderer and its element.
  const [renderers, setRenderers] = createSignal<readonly ContentRenderer[]>([]);

  return {
    renderers,
    setRenderer(id: string, renderer: ContentRenderer) {
      setRenderers((list) => {
        const index = list.findIndex((item) => item.id === id);
        if (index === -1) return [...list, renderer];
        const next = list.slice();
        next[index] = renderer;
        return next;
      });
    },
    removeRenderer(id: string) {
      setRenderers((list) => list.filter((item) => item.id !== id));
    },
  };
}

function RendererPortal(props: { renderer: ContentRenderer }) {
  const Component = dynamic(() => props.renderer.component);
  return (
    <Portal mount={props.renderer.element}>
      <Component {...props.renderer.props} />
    </Portal>
  );
}

export const EditorContent = (props: EditorContentProps) => {
  let editorContentRef: HTMLDivElement | undefined;
  const rest = omit(props, "editor");
  const [content, setContent] = createSignal<ContentComponent | null>(null);

  // Compute reads the editor; the apply phase moves its DOM in after the element mounts, and
  // returns the cleanup that moves it out again.
  createEffect(
    () => props.editor as EditorWithContentComponent | null,
    (editor) => {
      const element = editorContentRef;

      if (!editor || editor.isDestroyed || !element) {
        return;
      }

      if (editor.contentComponent && editor.isEditorContentInitialized) {
        return;
      }

      if (editor.view.dom?.parentNode) {
        element.append(...Array.from(editor.view.dom.parentNode.childNodes));
      }

      editor.setOptions({
        element,
      });

      const instance = getInstance();
      editor.contentComponent = instance;
      setContent(instance);
      editor.createNodeViews();
      editor.isEditorContentInitialized = true;

      return () => {
        editor.isEditorContentInitialized = false;
        setContent(null);

        if (!editor.isDestroyed) {
          editor.view.setProps({
            nodeViews: {},
          });
        }

        editor.contentComponent = null;

        try {
          if (!editor.view.dom?.parentNode) {
            return;
          }

          const newElement = document.createElement("div");
          newElement.append(...Array.from(editor.view.dom.parentNode.childNodes));

          editor.setOptions({
            element: newElement,
          });
        } catch {
          // do nothing
        }
      };
    }
  );

  const renderers = () => content()?.renderers() ?? [];

  // Node views render here, so they are owned by EditorContent: they see its context
  // and are disposed when their renderer is removed.
  return (
    <>
      <div
        ref={(el) => {
          editorContentRef = el;
        }}
        {...rest}
      />
      <For each={renderers()}>{(renderer) => <RendererPortal renderer={renderer} />}</For>
    </>
  );
};
