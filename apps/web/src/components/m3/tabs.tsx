import { Tabs as TabsPrimitive } from "@kobalte/core/tabs";
import { type ComponentProps, createContext, splitProps, useContext } from "solid-js";
import { cn } from "@/lib/utils";

export type TabsVariant = "primary" | "secondary";

const TabsContext = createContext<{ variant: TabsVariant }>({ variant: "primary" });

type TabsProps = ComponentProps<typeof TabsPrimitive> & { variant?: TabsVariant };
type TabsListProps = ComponentProps<typeof TabsPrimitive.List>;
type TabsTriggerProps = ComponentProps<typeof TabsPrimitive.Trigger>;
type TabsIndicatorProps = ComponentProps<typeof TabsPrimitive.Indicator>;
type TabsContentProps = ComponentProps<typeof TabsPrimitive.Content>;

/**
 * Primary tabs sit under an app bar and switch whole views; secondary tabs split one view.
 * Kobalte tabs: `value` / `onChange`.
 */
export function Tabs(props: TabsProps) {
  const [, rest] = splitProps(props, ["class", "ref", "variant"]);
  return (
    <TabsContext.Provider
      value={{
        get variant() {
          return props.variant ?? "primary";
        },
      }}
    >
      <TabsPrimitive
        ref={props.ref}
        data-slot="tabs"
        data-variant={props.variant ?? "primary"}
        class={cn("group/tabs flex w-full flex-col", props.class)}
        {...rest}
      />
    </TabsContext.Provider>
  );
}

/** The tab row, with a divider along the bottom. Put TabsIndicator last. */
export function TabsList(props: TabsListProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <TabsPrimitive.List
      ref={props.ref}
      data-slot="tabs-list"
      class={cn(
        "relative flex w-full items-stretch overflow-x-auto border-b border-outline-variant bg-surface [scrollbar-width:none]",
        props.class
      )}
      {...rest}
    />
  );
}

const triggerVariantClasses = {
  primary:
    "flex-col gap-0.5 typescale-title-small data-selected:text-primary has-[svg]:min-h-16 has-[svg]:typescale-title-small",
  secondary: "flex-row gap-2 typescale-title-small data-selected:text-on-surface",
};

/** A tab: label, icon, or both (stacked in primary tabs, inline in secondary tabs). */
export function TabsTrigger(props: TabsTriggerProps) {
  const context = useContext(TabsContext);
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <TabsPrimitive.Trigger
      ref={props.ref}
      data-slot="tabs-trigger"
      class={cn(
        "relative flex min-h-12 min-w-24 flex-1 cursor-pointer items-center justify-center px-4 whitespace-nowrap text-on-surface-variant outline-none select-none state-layer focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-secondary motion-fast data-disabled:pointer-events-none data-disabled:text-on-surface/38 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-6",
        triggerVariantClasses[context.variant],
        props.class
      )}
      {...rest}
    />
  );
}

const indicatorVariantClasses = {
  /** 3px with rounded top, inset so it roughly spans the label. */
  primary: "h-0.75 rounded-t-[3px] bg-clip-content px-6",
  /** 2px, full tab width. */
  secondary: "h-0.5",
};

export function TabsIndicator(props: TabsIndicatorProps) {
  const context = useContext(TabsContext);
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <TabsPrimitive.Indicator
      ref={props.ref}
      data-slot="tabs-indicator"
      class={cn(
        "pointer-events-none absolute bottom-0 bg-primary motion-default",
        indicatorVariantClasses[context.variant],
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
      data-slot="tabs-content"
      class={cn(
        "py-4 outline-none focus-visible:outline-3 focus-visible:outline-secondary",
        props.class
      )}
      {...rest}
    />
  );
}
