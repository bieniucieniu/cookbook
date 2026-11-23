import {
  Tabs as TabsPrimitive,
  TabsIndicator as TabsIndicatorPrimitive,
  TabsList as TabsListPrimitive,
  TabsPanel as TabsPanelPrimitive,
  TabsTab as TabsTabPrimitive,
} from "@ui-sdk/solid/tabs";
import { type ComponentProps, createContext, omit, useContext } from "solid-js";
import { cn, partClass } from "@/lib/utils";

export type TabsVariant = "primary" | "secondary";

const TabsContext = createContext<{ variant: TabsVariant }>({ variant: "primary" });

type TabsProps = ComponentProps<typeof TabsPrimitive> & { variant?: TabsVariant };
type TabsListProps = ComponentProps<typeof TabsListPrimitive>;
type TabsTriggerProps = ComponentProps<typeof TabsTabPrimitive>;
type TabsIndicatorProps = ComponentProps<typeof TabsIndicatorPrimitive>;
type TabsContentProps = ComponentProps<typeof TabsPanelPrimitive>;

/**
 * Primary tabs sit under an app bar and switch whole views; secondary tabs split one view.
 * ui-sdk tabs: `value` / `onValueChange`; each tab and its panel share a `value`.
 */
export function Tabs(props: TabsProps) {
  const rest = omit(props, "variant");
  return (
    <TabsContext
      value={{
        get variant() {
          return props.variant ?? "primary";
        },
      }}
    >
      <TabsPrimitive
        data-variant={props.variant ?? "primary"}
        {...rest}
        class={partClass(() => cn("group/tabs flex w-full flex-col"), props.class)}
      />
    </TabsContext>
  );
}

/** The tab row, with a divider along the bottom. Put TabsIndicator last. */
export function TabsList(props: TabsListProps) {
  return (
    <TabsListPrimitive
      {...props}
      class={partClass(
        () =>
          cn(
            "relative flex w-full items-stretch overflow-x-auto border-b border-outline-variant bg-surface [scrollbar-width:none]"
          ),
        props.class
      )}
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
  return (
    <TabsTabPrimitive
      {...props}
      class={partClass(
        () =>
          cn(
            "relative flex min-h-12 min-w-24 flex-1 cursor-pointer items-center justify-center px-4 whitespace-nowrap text-on-surface-variant outline-none select-none state-layer focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-secondary motion-fast data-disabled:pointer-events-none data-disabled:text-on-surface/38 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-6",
            triggerVariantClasses[context.variant]
          ),
        props.class
      )}
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
  return (
    <TabsIndicatorPrimitive
      {...props}
      class={partClass(
        () =>
          cn(
            "pointer-events-none absolute bottom-0 left-(--active-tab-left) w-(--active-tab-width) bg-primary motion-default",
            indicatorVariantClasses[context.variant]
          ),
        props.class
      )}
    />
  );
}

export function TabsContent(props: TabsContentProps) {
  return (
    <TabsPanelPrimitive
      {...props}
      class={partClass(
        () => cn("py-4 outline-none focus-visible:outline-3 focus-visible:outline-secondary"),
        props.class
      )}
    />
  );
}
