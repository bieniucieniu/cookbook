import { createFileRoute } from "@tanstack/solid-router"
import { createResource, Show } from "solid-js"

export const Route = createFileRoute("/")({
  component: Home,
})

type Me = {
  id: number
  email: string
  firstName: string
  lastName: string
}

function Home() {
  const [me] = createResource(loadMe)
  return (
    <main>
      <h1>Cookbook</h1>
      <Show when={!me.loading} fallback={<p>Loading</p>}>
        <Show
          when={me.error}
          fallback={
            <Show when={me()} fallback={<a href="/api/auth/login">Log in</a>}>
              {(user) => (
                <>
                  <p>{user().email}</p>
                  <form method="post" action="/api/auth/logout">
                    <button type="submit">Log out</button>
                  </form>
                </>
              )}
            </Show>
          }
        >
          <p>Could not load the session</p>
        </Show>
      </Show>
    </main>
  )
}

async function loadMe(): Promise<Me | null> {
  const response = await fetch("/api/auth/me", { credentials: "include" })
  if (response.status === 401) return null
  if (!response.ok) throw new Error("Could not load the session")
  return response.json()
}
