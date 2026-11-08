import { EditorContent, useEditor } from "@/components/tiptap";
import { cn } from "@/lib/utils";
import type { Editor } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { createEffect, on, untrack } from "solid-js";
import { Markdown } from "tiptap-markdown";

function readMarkdown(editor: Editor): string {
  const storage = editor.storage as { markdown?: { getMarkdown?: () => string } };
  return storage.markdown?.getMarkdown?.() ?? "";
}

/** Writes markdown. Used only for fields listed in lib/markdown-fields.ts. */
export function MarkdownEditor(props: {
  defaultValue: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  label: string;
  class?: string;
}) {
  // One snapshot: a tracked `defaultValue` would rebuild the editor on every keystroke.
  const options = untrack(() => ({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, italic: false }),
      Markdown.configure({ html: false, breaks: true, transformPastedText: true }),
      Placeholder.configure({ placeholder: props.placeholder ?? "" }),
    ],
    content: props.defaultValue,
    editorProps: {
      attributes: { "aria-label": props.label, role: "textbox", "aria-multiline": "true" },
    },
  }));
  const editor = useEditor(() => ({
    ...options,
    onUpdate: ({ editor: current }) => props.onChange(readMarkdown(current)),
  }));
  return (
    <div
      class={cn(
        "markdown rounded-md border border-input bg-input/20 px-3 py-2 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 dark:bg-input/30",
        props.class
      )}
    >
      <EditorContent editor={editor()} />
    </div>
  );
}

/** Renders a markdown field read-only. Plain text reads as one paragraph. */
export function MarkdownView(props: { value: string; class?: string }) {
  // Later values arrive through `setContent` below, not by rebuilding the editor.
  const options = untrack(() => ({
    extensions: [StarterKit, Markdown.configure({ html: false, breaks: true })],
    content: props.value,
    editable: false,
  }));
  const editor = useEditor(() => options);
  createEffect(
    on(
      () => props.value,
      (value) => {
        const current = editor();
        if (current && readMarkdown(current) !== value) current.commands.setContent(value);
      },
      { defer: true }
    )
  );
  return (
    <div class={cn("markdown", props.class)}>
      <EditorContent editor={editor()} />
    </div>
  );
}
