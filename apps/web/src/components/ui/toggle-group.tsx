import { ToggleGroup as ToggleGroupPrimitive } from "@kobalte/core/toggle-group";
import { type ComponentProps, createContext, type JSX, splitProps, useContext } from "solid-js";
import { type ToggleSize, type ToggleVariant, toggleVariants } from "./toggle";
import { cn } from "@/lib/utils";

type ToggleGroupStyle = { variant?: ToggleVariant; size?: ToggleSize; spacing?: number };

const ToggleGroupContext = createContext<ToggleGroupStyle>({});

type ToggleGroupProps = ComponentProps<typeof ToggleGroupPrimitive> & ToggleGroupStyle;
type ToggleGroupItemProps = ComponentProps<typeof ToggleGroupPrimitive.Item> & {
  variant?: ToggleVariant;
  size?: ToggleSize;
};

export function ToggleGroup(props: ToggleGroupProps) {
  const [, rest] = splitProps(props, ["class", "ref", "style", "variant", "size", "spacing"]);
  const context: ToggleGroupStyle = {
    get variant() {
      return props.variant;
    },
    get size() {
      return props.size;
    },
    get spacing() {
      return props.spacing ?? 2;
    },
  };
  return (
    <ToggleGroupContext.Provider value={context}>
      <ToggleGroupPrimitive
        ref={props.ref}
        data-slot="toggle-group"
        data-variant={props.variant ?? "default"}
        data-size={props.size ?? "default"}
        data-spacing={props.spacing ?? 2}
        style={{
          "--gap": String(props.spacing ?? 2),
          ...(typeof props.style === "object" ? (props.style as JSX.CSSProperties) : {}),
        }}
        class={cn(
          "group/toggle-group flex w-fit flex-row items-center gap-[--spacing(var(--gap))] rounded-md data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch data-[size=sm]:rounded-[min(var(--radius-md),8px)]",
          props.class
        )}
        {...rest}
        orientation={props.orientation ?? "horizontal"}
      />
    </ToggleGroupContext.Provider>
  );
}

export function ToggleGroupItem(props: ToggleGroupItemProps) {
  const group = useContext(ToggleGroupContext);
  const [, rest] = splitProps(props, ["class", "ref", "variant", "size"]);
  return (
    <ToggleGroupPrimitive.Item
      ref={props.ref}
      data-slot="toggle-group-item"
      data-variant={group.variant ?? props.variant ?? "default"}
      data-size={group.size ?? props.size ?? "default"}
      data-spacing={group.spacing ?? 2}
      class={cn(
        "shrink-0 group-data-[spacing=0]/toggle-group:rounded-none group-data-[spacing=0]/toggle-group:px-2 focus:z-10 focus-visible:z-10 group-data-[spacing=0]/toggle-group:has-data-[icon=inline-end]:pr-1.5 group-data-[spacing=0]/toggle-group:has-data-[icon=inline-start]:pl-1.5 group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:first:rounded-l-md group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:first:rounded-t-md group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:last:rounded-r-md group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:last:rounded-b-md group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:data-[variant=outline]:border-l-0 group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:data-[variant=outline]:border-t-0 group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-l group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-t",
        toggleVariants({
          variant: group.variant ?? props.variant,
          size: group.size ?? props.size,
        }),
        props.class
      )}
      {...rest}
    />
  );
}
