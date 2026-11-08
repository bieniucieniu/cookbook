import { FloatingMenuPlugin, type FloatingMenuPluginProps } from "@tiptap/extension-floating-menu";
import { createEffect, createMemo, type JSX, onCleanup, splitProps, untrack } from "solid-js";
import { Portal, spread } from "solid-js/web";
import { useCurrentEditor } from "../Context";
import { getAutoPluginKey } from "./getAutoPluginKey";

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export type FloatingMenuProps = Omit<
  Optional<FloatingMenuPluginProps, "pluginKey">,
  "element" | "editor"
> & {
  editor: FloatingMenuPluginProps["editor"] | null;
} & JSX.HTMLAttributes<HTMLDivElement>;

export const FloatingMenu = (props: FloatingMenuProps) => {
  const [, rest] = splitProps(props, [
    "pluginKey",
    "editor",
    "updateDelay",
    "resizeDelay",
    "appendTo",
    "shouldShow",
    "options",
    "children",
  ]);

  const resolvedPluginKey = createMemo(() => getAutoPluginKey(props.pluginKey, "floatingMenu"));

  const menuEl = document.createElement("div");

  createEffect(() => {
    spread(menuEl, rest);
  });

  const currentEditorCtx = useCurrentEditor();
  let registration = 0;

  /**
   * The editor instance where the floating menu plugin will be registered.
   */
  const pluginEditor = () => props.editor || currentEditorCtx.editor;

  createEffect(() => {
    const editor = pluginEditor();

    if (!editor || editor.isDestroyed) {
      return;
    }

    const floatingMenuElement = menuEl;
    const current = ++registration;
    floatingMenuElement.style.visibility = "hidden";
    floatingMenuElement.style.position = "absolute";

    const pluginKey = resolvedPluginKey();
    // Options are read untracked: changing one must not re-register the plugin.
    // The `updateOptions` effect below forwards option changes.
    const plugin = untrack(() =>
      FloatingMenuPlugin({
        updateDelay: props.updateDelay,
        resizeDelay: props.resizeDelay,
        appendTo: props.appendTo,
        pluginKey,
        shouldShow: props.shouldShow,
        options: props.options,
        editor: editor,
        element: floatingMenuElement,
      })
    );

    editor.registerPlugin(plugin);

    onCleanup(() => {
      editor.unregisterPlugin(pluginKey);
      window.requestAnimationFrame(() => {
        // A newer registration reuses this element; leave it in place.
        if (current !== registration) {
          return;
        }
        if (floatingMenuElement.parentNode) {
          floatingMenuElement.parentNode.removeChild(floatingMenuElement);
        }
      });
    });
  });

  createEffect(() => {
    const editor = pluginEditor();

    if (!editor || editor.isDestroyed) {
      return;
    }

    editor.view.dispatch(
      editor.state.tr.setMeta(resolvedPluginKey(), {
        type: "updateOptions",
        options: {
          updateDelay: props.updateDelay,
          resizeDelay: props.resizeDelay,
          shouldShow: props.shouldShow,
          options: props.options,
          appendTo: props.appendTo,
        },
      })
    );
  });

  return <Portal mount={menuEl}>{props.children}</Portal>;
};
