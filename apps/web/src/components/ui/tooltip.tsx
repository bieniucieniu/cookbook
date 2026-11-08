import TooltipPrimitive, {
  type ContentProps,
  type DynamicProps,
  type RootProps,
} from "@corvu/tooltip";
import { splitProps } from "solid-js";
import { cn } from "@/lib/utils";

export function Tooltip(props: RootProps) {
  return <TooltipPrimitive {...props} />;
}

export function TooltipContent(props: DynamicProps<"div", ContentProps>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <TooltipPrimitive.Content
      ref={props.ref}
      data-slot="tooltip-content"
      class={cn(
        "z-50 inline-flex w-fit max-w-xs items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs text-background has-data-[slot=kbd]:pr-1.5 data-[placement^=bottom]:slide-in-from-top-2 data-[placement^=left]:slide-in-from-right-2 data-[placement^=right]:slide-in-from-left-2 data-[placement^=top]:slide-in-from-bottom-2 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
        props.class
      )}
      {...rest}
    />
  );
}

export const TooltipAnchor = TooltipPrimitive.Anchor;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export const TooltipPortal = TooltipPrimitive.Portal;

export const useTooltipContext = TooltipPrimitive.useContext;
