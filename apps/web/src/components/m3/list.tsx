import { type JSX, type ValidComponent } from "@solidjs/web";
import { omit } from "solid-js";
import { dynamic } from "@solidjs/web";
import { cn } from "@/lib/utils";

type ListProps = JSX.HTMLAttributes<HTMLElement> & { as?: ValidComponent };

/** A vertical list. Renders a `ul` unless `as` says otherwise (e.g. `nav`, `div`). */
export function List(props: ListProps) {
  const rest = omit(props, "as");
  const Tag = dynamic(() => props.as ?? "ul");
  return (
    <Tag data-slot="list" {...rest} class={cn("flex flex-col py-2 text-on-surface", props.class)} />
  );
}

type ListItemProps = JSX.HTMLAttributes<HTMLElement> &
  Pick<JSX.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "target" | "rel"> &
  Pick<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "disabled" | "type"> & {
    /** Render as `a` or `button` for an interactive row; it gets a state layer and focus ring. */
    as?: ValidComponent;
    /** Set 3 for a three-line item (88px, top-aligned). One and two lines are detected. */
    lines?: 1 | 2 | 3;
  };

/**
 * One row: ListItemLeading, ListItemContent (overline, headline, supporting text), and
 * ListItemTrailing. Height follows content: 56 (one line), 72 (two), 88 (three).
 */
export function ListItem(props: ListItemProps) {
  const rest = omit(props, "as", "lines");
  const interactive = () => props.as !== undefined && props.as !== "li";
  const Tag = dynamic(() => props.as ?? "li");
  return (
    <Tag
      data-slot="list-item"
      data-lines={props.lines}
      {...rest}
      class={cn(
        "group/list-item relative flex min-h-14 w-full items-center gap-4 px-4 py-2 text-left has-data-[slot=list-item-supporting-text]:min-h-18 has-data-[slot=list-item-overline]:min-h-18 aria-disabled:pointer-events-none aria-disabled:opacity-38 data-[lines=3]:min-h-22 data-[lines=3]:items-start data-[lines=3]:py-3",
        interactive() &&
          "cursor-pointer state-layer focus-ring outline-none [--state-layer-color:var(--md-sys-color-on-surface)] disabled:pointer-events-none disabled:opacity-38",
        props.class
      )}
    />
  );
}

/** Icon (24px), avatar (40px, round), or image (56px). */
export function ListItemLeading(props: JSX.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="list-item-leading"
      {...props}
      class={cn(
        "flex shrink-0 items-center justify-center text-on-surface-variant [&_svg:not([class*='size-'])]:size-6 [&>img]:size-10 [&>img]:rounded-full [&>img]:object-cover",
        props.class
      )}
    />
  );
}

export function ListItemContent(props: JSX.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="list-item-content"
      {...props}
      class={cn("flex min-w-0 flex-1 flex-col", props.class)}
    />
  );
}

export function ListItemOverline(props: JSX.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="list-item-overline"
      {...props}
      class={cn("truncate typescale-label-small text-on-surface-variant", props.class)}
    />
  );
}

export function ListItemHeadline(props: JSX.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="list-item-headline"
      {...props}
      class={cn("truncate typescale-body-large text-on-surface", props.class)}
    />
  );
}

export function ListItemSupportingText(props: JSX.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="list-item-supporting-text"
      {...props}
      class={cn("line-clamp-2 typescale-body-medium text-on-surface-variant", props.class)}
    />
  );
}

/** Trailing metadata text, icon, checkbox, or switch. */
export function ListItemTrailing(props: JSX.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="list-item-trailing"
      {...props}
      class={cn(
        "ml-auto flex shrink-0 items-center gap-2 typescale-label-small text-on-surface-variant [&_svg:not([class*='size-'])]:size-6",
        props.class
      )}
    />
  );
}
