import { createFileRoute, useNavigate } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useAuthLogout } from "@/generated/endpoints"

export const Route = createFileRoute("/_authenticated/")({
  component: Home,
})

function Home() {
  const { me, queryClient } = Route.useRouteContext()
  const navigate = useNavigate()
  const logout = useAuthLogout()

  async function onLogout() {
    await logout.mutateAsync()
    queryClient.clear()
    await navigate({ to: "/login" })
  }

  return (
    <div className="flex min-h-svh flex-col items-start gap-4 p-8">
      <p>{me.email}</p>
      <Button type="button" onClick={onLogout} disabled={logout.isPending}>
        {logout.isPending ? <Spinner /> : null}
        Log out
      </Button>
    </div>
  )
}
