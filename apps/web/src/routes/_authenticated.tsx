import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

import { getAuthMeQueryOptions } from "@/generated/endpoints"

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context }) => {
    try {
      const me = await context.queryClient.fetchQuery(getAuthMeQueryOptions())
      return { me: me.data }
    } catch {
      throw redirect({ to: "/login" })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return <Outlet />
}
