import { IconAlertTriangle, type TablerIcon } from "@/components/icons";
import { LoadingIndicator } from "@/components/m3/loading-indicator";
import { cn } from "@/lib/utils";
import { type JSX, Show } from "solid-js";
import { Dynamic } from "solid-js/web";

/** Whole-page wait: the M3 loading indicator, centered. */
export function PageLoading(props: { label: string }) {
  return (
    <div class="flex justify-center py-16">
      <LoadingIndicator contained aria-label={props.label} />
    </div>
  );
}

/**
 * A failure that blocks the page or a section. M3 has no alert component: laid out like
 * EmptyState, with no container, and the icon in an error-container shape. Use a snackbar for a
 * failed action instead.
 */
export function ErrorBlock(props: { title: string; detail?: string; class?: string }) {
  return (
    <div
      role="alert"
      class={cn("flex flex-col items-center gap-4 px-6 py-12 text-center", props.class)}
    >
      <span class="flex size-20 items-center justify-center rounded-extra-large bg-error-container text-on-error-container">
        <IconAlertTriangle class="size-10" stroke={1.5} aria-hidden="true" />
      </span>
      <div class="flex max-w-prose min-w-0 flex-col gap-1">
        <p class="typescale-title-large text-on-surface">{props.title}</p>
        <Show when={props.detail}>
          <p class="typescale-body-medium break-words text-on-surface-variant">{props.detail}</p>
        </Show>
      </div>
    </div>
  );
}

/** Nothing to show yet: an icon in a tonal shape, a headline, a sentence, and an optional action. */
export function EmptyState(props: {
  icon: TablerIcon;
  title: string;
  description: string;
  children?: JSX.Element;
}) {
  return (
    <div class="flex flex-col items-center gap-4 px-6 py-12 text-center">
      <span class="flex size-20 items-center justify-center rounded-extra-large bg-secondary-container text-on-secondary-container">
        <Dynamic component={props.icon} class="size-10" stroke={1.5} aria-hidden="true" />
      </span>
      <div class="flex max-w-prose flex-col gap-1">
        <h2 class="typescale-title-large text-on-surface">{props.title}</h2>
        <p class="typescale-body-medium text-on-surface-variant">{props.description}</p>
      </div>
      {props.children}
    </div>
  );
}
