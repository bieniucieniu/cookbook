import { type JSX, splitProps, type ValidComponent } from "solid-js";
import { Dynamic } from "solid-js/web";
import { cn } from "@/lib/utils";

type ListProps = JSX.HTMLAttributes<HTMLElement> & { as?: ValidComponent };

/** A vertical list. Renders a `ul` unless `as` says otherwise (e.g. `nav`, `div`). */
export function List(props: ListProps) {
  const [, rest] = splitProps(props, ["class", "ref", "as"]);
  return (
    <Dynamic
      component={props.as ?? "ul"}
      ref={props.ref}
      data-slot="list"
      class={cn("flex flex-col py-2 text-on-surface", props.class)}
      {...rest}
    />
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
  const [, rest] = splitProps(props, ["class", "ref", "as", "lines"]);
  const interactive = () => props.as !== undefined && props.as !== "li";
  return (
    <Dynamic
      component={props.as ?? "li"}
      ref={props.ref}
      data-slot="list-item"
      data-lines={props.lines}
      class={cn(
        "group/list-item relative flex min-h-14 w-full items-center gap-4 px-4 py-2 text-left has-data-[slot=list-item-supporting-text]:min-h-18 has-data-[slot=list-item-overline]:min-h-18 aria-disabled:pointer-events-none aria-disabled:opacity-38 data-[lines=3]:min-h-22 data-[lines=3]:items-start data-[lines=3]:py-3",
        interactive() &&
          "cursor-pointer state-layer focus-ring outline-none [--state-layer-color:var(--md-sys-color-on-surface)] disabled:pointer-events-none disabled:opacity-38",
        props.class
      )}
      {...rest}
    />
  );
}

/** Icon (24px), avatar (40px, round), or image (56px). */
export function ListItemLeading(props: JSX.HTMLAttributes<HTMLSpanElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <span
      ref={props.ref}
      data-slot="list-item-leading"
      class={cn(
        "flex shrink-0 items-center justify-center text-on-surface-variant [&_svg:not([class*='size-'])]:size-6 [&>img]:size-10 [&>img]:rounded-full [&>img]:object-cover",
        props.class
      )}
      {...rest}
    />
  );
}

export function ListItemContent(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <div
      ref={props.ref}
      data-slot="list-item-content"
      class={cn("flex min-w-0 flex-1 flex-col", props.class)}
      {...rest}
    />
  );
}

export function ListItemOverline(props: JSX.HTMLAttributes<HTMLSpanElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <span
      ref={props.ref}
      data-slot="list-item-overline"
      class={cn("truncate typescale-label-small text-on-surface-variant", props.class)}
      {...rest}
    />
  );
}

export function ListItemHeadline(props: JSX.HTMLAttributes<HTMLSpanElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <span
      ref={props.ref}
      data-slot="list-item-headline"
      class={cn("truncate typescale-body-large text-on-surface", props.class)}
      {...rest}
    />
  );
}

export function ListItemSupportingText(props: JSX.HTMLAttributes<HTMLSpanElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <span
      ref={props.ref}
      data-slot="list-item-supporting-text"
      class={cn("line-clamp-2 typescale-body-medium text-on-surface-variant", props.class)}
      {...rest}
    />
  );
}

/** Trailing metadata text, icon, checkbox, or switch. */
export function ListItemTrailing(props: JSX.HTMLAttributes<HTMLSpanElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <span
      ref={props.ref}
      data-slot="list-item-trailing"
      class={cn(
        "ml-auto flex shrink-0 items-center gap-2 typescale-label-small text-on-surface-variant [&_svg:not([class*='size-'])]:size-6",
        props.class
      )}
      {...rest}
    />
  );
}
