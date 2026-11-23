import { FloatingMenuPlugin, type FloatingMenuPluginProps } from "@tiptap/extension-floating-menu";
import { type JSX } from "@solidjs/web";
import { Portal, spread } from "@solidjs/web";
import { createEffect, createMemo, omit } from "solid-js";
import { useCurrentEditor } from "../Context";
import { getAutoPluginKey } from "@/lib/utils/tiptap/getAutoPluginKey";

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export type FloatingMenuProps = Omit<
  Optional<FloatingMenuPluginProps, "pluginKey">,
  "element" | "editor"
> & {
  editor: FloatingMenuPluginProps["editor"] | null;
} & JSX.HTMLAttributes<HTMLDivElement>;

export const FloatingMenu = (props: FloatingMenuProps) => {
  const rest = omit(
    props,
    "pluginKey",
    "editor",
    "updateDelay",
    "resizeDelay",
    "appendTo",
    "shouldShow",
    "options",
    "children"
  );

  const resolvedPluginKey = createMemo(() => getAutoPluginKey(props.pluginKey, "floatingMenu"));

  const menuEl = document.createElement("div");

  // `spread` keeps the attributes in sync on its own; it runs once, in the component body.
  spread(menuEl, rest);

  const currentEditorCtx = useCurrentEditor();
  let registration = 0;

  /**
   * The editor instance where the floating menu plugin will be registered.
   */
  const pluginEditor = () => props.editor || currentEditorCtx.editor;

  // Compute reads the editor and the plugin key; the apply phase registers the plugin and returns
  // the cleanup that unregisters it. The apply phase is untracked, so changing an option does not
  // re-register the plugin: the `updateOptions` effect below forwards option changes.
  createEffect(
    () => ({ editor: pluginEditor(), pluginKey: resolvedPluginKey() }),
    ({ editor, pluginKey }) => {
      if (!editor || editor.isDestroyed) {
        return;
      }

      const floatingMenuElement = menuEl;
      const current = ++registration;
      floatingMenuElement.style.visibility = "hidden";
      floatingMenuElement.style.position = "absolute";

      const plugin = FloatingMenuPlugin({
        updateDelay: props.updateDelay,
        resizeDelay: props.resizeDelay,
        appendTo: props.appendTo,
        pluginKey,
        shouldShow: props.shouldShow,
        options: props.options,
        editor: editor,
        element: floatingMenuElement,
      });

      editor.registerPlugin(plugin);

      return () => {
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
      };
    }
  );

  createEffect(
    () => ({
      editor: pluginEditor(),
      pluginKey: resolvedPluginKey(),
      options: {
        updateDelay: props.updateDelay,
        resizeDelay: props.resizeDelay,
        shouldShow: props.shouldShow,
        options: props.options,
        appendTo: props.appendTo,
      },
    }),
    ({ editor, pluginKey, options }) => {
      if (!editor || editor.isDestroyed) {
        return;
      }

      editor.view.dispatch(
        editor.state.tr.setMeta(pluginKey, {
          type: "updateOptions",
          options,
        })
      );
    }
  );

  return <Portal mount={menuEl}>{props.children}</Portal>;
};
