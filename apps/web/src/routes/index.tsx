import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  component: Home,
})

function Home() {
  return <div className="flex min-h-svh flex-col items-start gap-4 p-8" />
}
