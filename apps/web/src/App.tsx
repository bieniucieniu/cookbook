import { IconAlertTriangle, IconArrowLeft, IconLogout, IconUserCircle } from "@/components/icons";
import {
  AppBar,
  AppBarHeadline,
  AppBarLeading,
  AppBarTitle,
  AppBarTrailing,
} from "@/components/m3/app-bar";
import { Button } from "@/components/m3/button";
import { iconButtonVariants } from "@/components/m3/icon-button";
import { LoadingIndicator } from "@/components/m3/loading-indicator";
import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuItemIcon,
  MenuItemLabel,
  MenuTrigger,
} from "@/components/m3/menu";
import { SnackbarRegion } from "@/components/m3/snackbar";
import { PageLoading } from "@/components/page-state";
import { ReadingPrefs } from "@/components/reading-prefs";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiBase } from "@/lib/api";
import { signedIn, useSession } from "@/lib/session";
import { useLocation, useMatch } from "@solidjs/router";
import { createSignal, Loading, Match, onSettled, Show, Switch } from "solid-js";
import { paths } from "./paths";
import { Router } from "./router";
import "./index.css";

/** The whole app: the app bar, the matched page, and the snackbar region. */
export default function App() {
  return (
    <Router>
      {(props) => (
        <>
          <SessionHeader />
          <Loading fallback={<PageLoading label="Loading the page" />}>{props.children}</Loading>
          {/* Pages with bottom controls (cook mode) set --snackbar-offset to sit above them. */}
          <SnackbarRegion class="bottom-[calc(var(--snackbar-offset,0px)+1rem)]" />
        </>
      )}
    </Router>
  );
}

/**
 * Small top app bar, sticky: up navigation on inner pages, the app name, then reading, theme, and
 * account actions.
 */
function SessionHeader() {
  const location = useLocation();
  const inner = () => location.pathname !== "/";
  // M3: the bar sits on surface at the top and turns surface-container once content scrolls under.
  const [scrolled, setScrolled] = createSignal(false);
  let bar: HTMLElement | undefined;
  onSettled(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    // Publish the bar's real height as --app-bar-height. Sticky things below it (editor toolbar,
    // cook timers, the list's side panel) offset and size themselves from it, so they stay right
    // when the reading text size changes the bar's height.
    const root = document.documentElement.style;
    const observer = new ResizeObserver(([entry]) => {
      const height = entry?.borderBoxSize[0]?.blockSize ?? bar?.offsetHeight ?? 0;
      root.setProperty("--app-bar-height", `${height}px`);
    });
    if (bar) observer.observe(bar);
    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  });
  return (
    <AppBar ref={(el) => (bar = el)} scrolled={scrolled()} class="sticky top-0 z-30">
      <Show when={inner()}>
        <AppBarLeading>
          <UpButton />
        </AppBarLeading>
      </Show>
      {/* Without a leading icon, M3 starts the title 16px from the edge (bar and headline add 8px). */}
      <AppBarHeadline class={inner() ? undefined : "ml-2"}>
        <AppBarTitle>
          <a href={paths()} class="rounded-small focus-ring">
            Cookbook
          </a>
        </AppBarTitle>
      </AppBarHeadline>
      <AppBarTrailing>
        <ReadingPrefs />
        <ThemeToggle />
        <Loading fallback={<LoadingIndicator aria-label="Loading the session" class="size-10" />}>
          <SessionAction />
        </Loading>
      </AppBarTrailing>
    </AppBar>
  );
}

/** Log in, the account menu, or a note that the session could not be read. */
function SessionAction() {
  const session = useSession();
  return (
    <Switch>
      <Match when={session().status === "signed-out"}>
        <form action={`${apiBase}/auth/login`} method="get" class="contents">
          <Button type="submit" size="sm" class="ml-1">
            Log in
          </Button>
        </form>
      </Match>
      <Match when={session().status === "unavailable"}>
        <span role="status" class="flex items-center gap-1 px-2 typescale-label-medium text-error">
          <IconAlertTriangle class="size-5" aria-hidden="true" />
          Session unavailable
        </span>
      </Match>
      <Match when={signedIn(session())}>{(user) => <AccountMenu email={user().email} />}</Match>
    </Switch>
  );
}

/** Up one level: the editor goes back to its recipe, everything else to the list. */
function UpButton() {
  const edit = useMatch(() => "/recipes/:id/edit");
  const editing = () => edit()?.params.id;
  return (
    <Show
      when={editing()}
      fallback={
        <a href={paths()} class={iconButtonVariants()} aria-label="Back to recipes">
          <IconArrowLeft aria-hidden="true" />
        </a>
      }
    >
      {(id) => (
        <a href={paths.recipes(id())} class={iconButtonVariants()} aria-label="Back to the recipe">
          <IconArrowLeft aria-hidden="true" />
        </a>
      )}
    </Show>
  );
}

/** Signed-in account: the email and log out. Log out is a form POST, not a fetch. */
function AccountMenu(props: { email: string }) {
  let logout: HTMLFormElement | undefined;
  return (
    <>
      <form ref={(el) => (logout = el)} method="post" action={`${apiBase}/auth/logout`} hidden />
      <Menu>
        <MenuTrigger aria-label="Account" class={iconButtonVariants()}>
          <IconUserCircle aria-hidden="true" />
        </MenuTrigger>
        <MenuContent align="end" class="min-w-56">
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
      </Menu>
    </>
  );
}
