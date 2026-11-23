import { cn } from "@/lib/utils";
import { clientOnly } from "@solidjs/web";

/**
 * tiptap, ProseMirror and markdown-it are the largest part of the bundle and only run in the
 * browser, so they load on the client after hydration. The server, and the client until then,
 * renders the raw text in the same box.
 */
const TiptapEditor = clientOnly(() => import("./markdown-tiptap"), {
  export: "MarkdownEditor",
  lazy: true,
});
const TiptapView = clientOnly(() => import("./markdown-tiptap"), {
  export: "MarkdownView",
  lazy: true,
});

type EditorProps = {
  defaultValue: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  label: string;
  class?: string;
};

/** Writes markdown. Used only for fields listed in lib/markdown-fields.ts. */
export function MarkdownEditor(props: EditorProps) {
  return (
    <TiptapEditor
      {...props}
      fallback={
        <div
          class={cn(
            "markdown min-h-16 rounded-extra-small px-4 py-3 whitespace-pre-wrap text-on-surface-variant ring-1 ring-outline ring-inset",
            props.class
          )}
          aria-busy="true"
        >
          {props.defaultValue || props.placeholder}
        </div>
      }
    />
  );
}

/** Renders a markdown field read-only. Plain text reads as one paragraph. */
export function MarkdownView(props: { value: string; class?: string }) {
  return (
    <TiptapView
      {...props}
      fallback={<div class={cn("markdown whitespace-pre-wrap", props.class)}>{props.value}</div>}
    />
  );
}
