import { type ComponentProps, type JSX } from "@solidjs/web";
import { omit } from "solid-js";
import { dynamic } from "@solidjs/web";

import { useSolidNodeView } from "@/lib/tiptap/useSolidNodeView";

export interface NodeViewWrapperProps extends ComponentProps<"div"> {
  as?: keyof JSX.IntrinsicElements | (string & {});
}

export function NodeViewWrapper(props: NodeViewWrapperProps) {
  const rest = omit(props, "as");
  const nv = useSolidNodeView();

  const Tag = dynamic(() => props.as || "div");
  return (
    <Tag
      {...rest}
      data-node-view-wrapper=""
      onDragStart={nv.onDragStart}
      style={{
        "white-space": "normal",
        ...(typeof props.style === "object" ? props.style : {}),
      }}
    />
  );
}
