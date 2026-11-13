import { apiBase } from "@/lib/api";
import { useCurrentUser } from "@/generated/auth/auth";
import { signedIn } from "@/lib/session";
import { isUnauthorized } from "@/mutator";
import { IconAlertTriangle, IconArrowLeft, IconLogout, IconUserCircle } from "@/components/icons";
import {
  AppBar,
  AppBarHeadline,
  AppBarLeading,
  AppBarTitle,
  AppBarTrailing,
} from "@/components/m3/app-bar";
import { Button } from "@/components/m3/button";
import { IconButton, iconButtonVariants } from "@/components/m3/icon-button";
import { LoadingIndicator } from "@/components/m3/loading-indicator";
import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuItemIcon,
  MenuItemLabel,
  MenuPortal,
  MenuTrigger,
} from "@/components/m3/menu";
import { SnackbarList, SnackbarRegion } from "@/components/m3/snackbar";
import { ReadingPrefs } from "@/components/reading-prefs";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link, Outlet, createRootRoute, useLocation } from "@tanstack/solid-router";
import { TanStackRouterDevtools } from "@tanstack/solid-router-devtools";
import { createSignal, Match, onCleanup, onMount, Show, Switch } from "solid-js";
import { Portal } from "solid-js/web";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <>
      <SessionHeader />
      <Outlet />
      <Portal>
        {/* Pages with bottom controls (cook mode) set --snackbar-offset to sit above them. */}
        <SnackbarRegion class="bottom-[var(--snackbar-offset,0px)]">
          <SnackbarList />
        </SnackbarRegion>
      </Portal>
      <TanStackRouterDevtools />
    </>
  );
}

/**
 * Small top app bar, sticky: up navigation on inner pages, the app name, then reading, theme, and
 * account actions.
 */
function SessionHeader() {
  const session = useCurrentUser();
  const location = useLocation();
  const inner = () => location().pathname !== "/";
  // M3: the bar sits on surface at the top and turns surface-container once content scrolls under.
  const [scrolled, setScrolled] = createSignal(false);
  const onScroll = () => setScrolled(window.scrollY > 0);
  onMount(() => {
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  });
  onCleanup(() => window.removeEventListener("scroll", onScroll));
  // Publish the bar's real height as --app-bar-height. Sticky things below it (editor toolbar,
  // cook timers, the list's side panel) offset and size themselves from it, so they stay right
  // when the reading text size changes the bar's height.
  let bar: HTMLElement | undefined;
  onMount(() => {
    if (!bar) return;
    const root = document.documentElement.style;
    const observer = new ResizeObserver(([entry]) => {
      const height = entry?.borderBoxSize[0]?.blockSize ?? bar?.offsetHeight ?? 0;
      root.setProperty("--app-bar-height", `${height}px`);
    });
    observer.observe(bar);
    onCleanup(() => observer.disconnect());
  });
  return (
    <AppBar
      ref={(element) => {
        bar = element;
      }}
      scrolled={scrolled()}
      class="sticky top-0 z-30"
    >
      <Show when={inner()}>
        <AppBarLeading>
          <UpButton pathname={location().pathname} />
        </AppBarLeading>
      </Show>
      {/* Without a leading icon, M3 starts the title 16px from the edge (bar and headline add 8px). */}
      <AppBarHeadline class={inner() ? undefined : "ml-2"}>
        <AppBarTitle>
          <Link to="/" class="rounded-small focus-ring">
            Cookbook
          </Link>
        </AppBarTitle>
      </AppBarHeadline>
      <AppBarTrailing>
        <ReadingPrefs />
        <ThemeToggle />
        <Switch>
          <Match when={session.isPending}>
            <LoadingIndicator aria-label="Loading the session" class="size-10" />
          </Match>
          <Match when={session.isError && isUnauthorized(session.error)}>
            <form action={`${apiBase}/auth/login`} method="get" class="contents">
              <Button type="submit" size="sm" class="ml-1">
                Log in
              </Button>
            </form>
          </Match>
          <Match when={session.isError}>
            <span
              role="status"
              class="flex items-center gap-1 px-2 typescale-label-medium text-error"
            >
              <IconAlertTriangle class="size-5" aria-hidden="true" />
              Session unavailable
            </span>
          </Match>
          <Match when={signedIn(session)}>{(user) => <AccountMenu email={user().email} />}</Match>
        </Switch>
      </AppBarTrailing>
    </AppBar>
  );
}

/** Up one level: the editor goes back to its recipe, everything else to the list. */
function UpButton(props: { pathname: string }) {
  const editing = () => /^\/recipes\/([^/]+)\/edit\/?$/.exec(props.pathname)?.[1];
  return (
    <Show
      when={editing()}
      fallback={
        <Link to="/" class={iconButtonVariants()} aria-label="Back to recipes">
          <IconArrowLeft aria-hidden="true" />
        </Link>
      }
    >
      {(id) => (
        <Link
          to="/recipes/$id"
          params={{ id: id() }}
          class={iconButtonVariants()}
          aria-label="Back to the recipe"
        >
          <IconArrowLeft aria-hidden="true" />
        </Link>
      )}
    </Show>
  );
}

/** Signed-in account: the email and log out. Log out is a form POST, not a fetch. */
function AccountMenu(props: { email: string }) {
  let logout: HTMLFormElement | undefined;
  return (
    <>
      <form
        ref={(el) => {
          logout = el;
        }}
        method="post"
        action={`${apiBase}/auth/logout`}
        hidden
      />
      <Menu placement="bottom-end">
        <MenuTrigger as={IconButton} aria-label="Account">
          <IconUserCircle aria-hidden="true" />
        </MenuTrigger>
        <MenuPortal>
          <MenuContent class="min-w-56">
            <MenuGroup>
              <MenuGroupLabel class="truncate">{props.email}</MenuGroupLabel>
              <MenuItem onSelect={() => logout?.requestSubmit()}>
                <MenuItemIcon>
                  <IconLogout aria-hidden="true" />
                </MenuItemIcon>
                <MenuItemLabel>Log out</MenuItemLabel>
              </MenuItem>
            </MenuGroup>
          </MenuContent>
        </MenuPortal>
      </Menu>
    </>
  );
}
