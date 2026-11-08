import { Tabs as TabsPrimitive } from "@kobalte/core/tabs";
import { type ComponentProps, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

type TabsProps = ComponentProps<typeof TabsPrimitive>;
type TabsListProps = ComponentProps<typeof TabsPrimitive.List> & { variant?: "default" | "line" };
type TabsTriggerProps = ComponentProps<typeof TabsPrimitive.Trigger>;
type TabsIndicatorProps = ComponentProps<typeof TabsPrimitive.Indicator>;
type TabsContentProps = ComponentProps<typeof TabsPrimitive.Content>;

export function Tabs(props: TabsProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <TabsPrimitive
      ref={props.ref}
      data-slot="tabs"
      class={cn("group/tabs flex gap-2 data-[orientation=horizontal]:flex-col", props.class)}
      {...rest}
    />
  );
}

export function TabsList(props: TabsListProps) {
  const [, rest] = splitProps(props, ["class", "ref", "variant"]);
  return (
    <TabsPrimitive.List
      ref={props.ref}
      data-slot="tabs-list"
      data-variant={props.variant ?? "default"}
      class={cn(
        "group/tabs-list relative inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground data-[orientation=horizontal]:h-8 data-[orientation=vertical]:h-fit data-[orientation=vertical]:flex-col data-[variant=default]:bg-muted data-[variant=line]:gap-1 data-[variant=line]:rounded-none data-[variant=line]:bg-transparent",
        props.class
      )}
      {...rest}
    />
  );
}

export function TabsTrigger(props: TabsTriggerProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <TabsPrimitive.Trigger
      ref={props.ref}
      class={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-foreground/60 transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start group-data-[orientation=vertical]/tabs:py-[calc(--spacing(1.25))] hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring data-disabled:pointer-events-none data-disabled:opacity-50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        "data-selected:bg-background data-selected:text-foreground dark:data-selected:border-input dark:data-selected:bg-input/30 dark:data-selected:text-foreground",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-selected:bg-transparent dark:group-data-[variant=line]/tabs-list:data-selected:border-transparent dark:group-data-[variant=line]/tabs-list:data-selected:bg-transparent",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-selected:after:opacity-100",
        props.class
      )}
      {...rest}
    />
  );
}

export function TabsIndicator(props: TabsIndicatorProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <TabsPrimitive.Indicator
      ref={props.ref}
      class={cn(
        "pointer-events-none absolute bg-foreground transition-all duration-200 data-[orientation=horizontal]:bottom-[-2px] data-[orientation=horizontal]:h-0.5 data-[orientation=vertical]:-right-1 data-[orientation=vertical]:w-0.5",
        props.class
      )}
      {...rest}
    />
  );
}

export function TabsContent(props: TabsContentProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <TabsPrimitive.Content
      ref={props.ref}
      class={cn("flex-1 text-xs/relaxed outline-none", props.class)}
      {...rest}
    />
  );
}
