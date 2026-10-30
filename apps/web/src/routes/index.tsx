import { createFileRoute } from "@tanstack/solid-router"

export const Route = createFileRoute("/")({
  component: Home,
})

function Home() {
  return (
    <main>
      <h1>Cookbook</h1>
    </main>
  )
}
