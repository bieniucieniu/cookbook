import { BubbleMenuPlugin, type BubbleMenuPluginProps } from "@tiptap/extension-bubble-menu";
import { createEffect, createMemo, type JSX, onCleanup, splitProps, untrack } from "solid-js";
import { Portal, spread } from "solid-js/web";
import { useCurrentEditor } from "../Context";
import { getAutoPluginKey } from "./getAutoPluginKey";

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export type BubbleMenuProps = Optional<
  Omit<Optional<BubbleMenuPluginProps, "pluginKey">, "element">,
  "editor"
> &
  JSX.HTMLAttributes<HTMLDivElement>;

export const BubbleMenu = (props: BubbleMenuProps) => {
  const [, rest] = splitProps(props, [
    "pluginKey",
    "editor",
    "updateDelay",
    "resizeDelay",
    "appendTo",
    "shouldShow",
    "getReferencedVirtualElement",
    "options",
    "children",
  ]);

  const resolvedPluginKey = createMemo(() => getAutoPluginKey(props.pluginKey, "bubbleMenu"));

  const menuEl = document.createElement("div");

  createEffect(() => {
    spread(menuEl, rest);
  });

  const currentEditorCtx = useCurrentEditor();
  let registration = 0;

  /**
   * The editor instance where the bubble menu plugin will be registered.
   */
  const pluginEditor = () => props.editor || currentEditorCtx.editor;

  createEffect(() => {
    const editor = pluginEditor();

    if (!editor || editor.isDestroyed) {
      return;
    }

    const bubbleMenuElement = menuEl;
    const current = ++registration;
    bubbleMenuElement.style.visibility = "hidden";
    bubbleMenuElement.style.position = "absolute";
    const pluginKey = resolvedPluginKey();

    // Options are read untracked: changing one must not re-register the plugin.
    // The `updateOptions` effect below forwards option changes.
    const plugin = untrack(() =>
      BubbleMenuPlugin({
        updateDelay: props.updateDelay,
        resizeDelay: props.resizeDelay,
        appendTo: props.appendTo,
        pluginKey,
        shouldShow: props.shouldShow,
        getReferencedVirtualElement: props.getReferencedVirtualElement,
        options: props.options,
        editor: editor,
        element: bubbleMenuElement,
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
        if (bubbleMenuElement.parentNode) {
          bubbleMenuElement.parentNode.removeChild(bubbleMenuElement);
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
          getReferencedVirtualElement: props.getReferencedVirtualElement,
        },
      })
    );
  });

  return <Portal mount={menuEl}>{props.children}</Portal>;
};
