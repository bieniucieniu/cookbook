import { cn } from "@/lib/utils";
import { lazy, Suspense } from "solid-js";

/**
 * tiptap, ProseMirror and markdown-it are the largest part of the bundle, and markdown fields
 * are optional, so they load on first use. Until then the raw text shows in the same box.
 */
const TiptapEditor = lazy(() =>
  import("./markdown-tiptap").then((module) => ({ default: module.MarkdownEditor }))
);
const TiptapView = lazy(() =>
  import("./markdown-tiptap").then((module) => ({ default: module.MarkdownView }))
);

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
    <Suspense
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
    >
      <TiptapEditor {...props} />
    </Suspense>
  );
}

/** Renders a markdown field read-only. Plain text reads as one paragraph. */
export function MarkdownView(props: { value: string; class?: string }) {
  return (
    <Suspense
      fallback={<div class={cn("markdown whitespace-pre-wrap", props.class)}>{props.value}</div>}
    >
      <TiptapView {...props} />
    </Suspense>
  );
}
