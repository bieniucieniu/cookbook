import { createFileRoute, isRedirect, redirect, useNavigate } from "@tanstack/react-router"
import { type FormEvent, useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { getAuthMeQueryOptions, useAuthLogin, useAuthRegister } from "@/generated/endpoints"
import type { ErrorType } from "@/mutator"

export const Route = createFileRoute("/login")({
  beforeLoad: async ({ context }) => {
    try {
      await context.queryClient.fetchQuery(getAuthMeQueryOptions())
      throw redirect({ to: "/" })
    } catch (error) {
      if (isRedirect(error)) {
        throw error
      }
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthLogin()
  const register = useAuthRegister()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const pending = login.isPending || register.isPending

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    try {
      if (mode === "login") {
        await login.mutateAsync({ data: { email, password } })
      } else {
        await register.mutateAsync({ data: { email, password } })
      }
      await navigate({ to: "/" })
    } catch (cause) {
      const status = (cause as ErrorType).status
      setError(
        status === 401
          ? "Invalid email or password"
          : status === 409
            ? "Email already registered"
            : "Request failed"
      )
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{mode === "login" ? "Sign in" : "Create account"}</CardTitle>
          <CardDescription>
            {mode === "login" ? "Email and password" : "Register with email and password"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </Field>
              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <Button type="submit" disabled={pending}>
                {pending ? <Spinner /> : null}
                {mode === "login" ? "Sign in" : "Register"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login")
                  setError(null)
                }}
              >
                {mode === "login" ? "Need an account?" : "Have an account?"}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
