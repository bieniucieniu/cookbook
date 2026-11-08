import { type currentUserResponse, useCurrentUser } from "@/generated/auth/auth";
import type { MeResponse } from "@/generated/model";
import { isUnauthorized } from "@/mutator";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ReadingPrefs } from "@/components/reading-prefs";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link, Outlet, createRootRoute } from "@tanstack/solid-router";
import { TanStackRouterDevtools } from "@tanstack/solid-router-devtools";
import { Show } from "solid-js";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <>
      <SessionHeader />
      <Outlet />
      <TanStackRouterDevtools />
    </>
  );
}

function SessionHeader() {
  const session = useCurrentUser();
  return (
    <header class="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
      <Link to="/" class="text-base font-bold">
        Cookbook
      </Link>
      <div class="flex items-center gap-2">
        <ReadingPrefs />
        <ThemeToggle />
        <Show when={!session.isPending} fallback={<Spinner />}>
          <Show
            when={session.isError && isUnauthorized(session.error)}
            fallback={
              <Show
                when={session.isError}
                fallback={
                  <Show when={signedIn(session.data)}>
                    {(user) => (
                      <div class="flex items-center gap-2">
                        <span class="text-xs text-muted-foreground">{user().email}</span>
                        <form method="post" action="/api/auth/logout">
                          <Button type="submit">Log out</Button>
                        </form>
                      </div>
                    )}
                  </Show>
                }
              >
                <Alert>
                  <AlertTitle>Could not load the session</AlertTitle>
                </Alert>
              </Show>
            }
          >
            <form action="/api/auth/login" method="get">
              <Button type="submit">Log in</Button>
            </form>
          </Show>
        </Show>
      </div>
    </header>
  );
}

function signedIn(result: currentUserResponse | undefined): MeResponse | undefined {
  if (!result || result.status !== 200) return undefined;
  return result.data;
}
