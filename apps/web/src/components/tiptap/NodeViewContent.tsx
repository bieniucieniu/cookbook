import { type ComponentProps, type JSX } from "@solidjs/web";
import { omit } from "solid-js";
import { dynamic } from "@solidjs/web";
import { useSolidNodeView } from "@/lib/tiptap/useSolidNodeView";

export interface NodeViewContentProps extends ComponentProps<"div"> {
  as?: keyof JSX.IntrinsicElements | (string & {});
}

export function NodeViewContent(props: NodeViewContentProps) {
  const rest = omit(props, "as");
  const nv = useSolidNodeView();

  const Tag = dynamic(() => props.as || "div");
  return (
    <Tag
      {...rest}
      // The renderer and the caller both need the element. `ref` set here replaces the one in
      // the spread, so pass both; Solid calls each entry and skips an empty one.
      ref={[nv.nodeViewContentRef, props.ref]}
      data-node-view-content=""
      style={{
        "white-space": "pre-wrap",
        ...(typeof props.style === "object" ? props.style : {}),
      }}
    >
      {nv.nodeViewContentChildren}
    </Tag>
  );
}
