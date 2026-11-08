Gradle multi-project + pnpm workspace. Tooling via [devenv](https://devenv.sh).

```
apps/api       Kotlin/Native Ktor (CIO) + sqlx4k Postgres + SQLDelight
apps/web       Solid + TanStack Router + Query (Vite+) on :3000, proxies /api → :8080 (API under /api/v1)
packages/core  Kotlin/Native shared lib
packages/workos  WorkOS client shaped like the official SDK. Ktor engine is passed in by the app.
```

### Env

```
devenv shell
# or: direnv allow
devenv --profile server up   # Postgres + Ktor :8080
devenv --profile web up     # + Vite :3000
devenv --profile all up     # same as web
```

Provides JDK 25, Gradle 9, Node, pnpm 11, Postgres. No `./gradlew`, no Corepack.

Server reads env in `apps/api`. Database defaults to `postgresql://127.0.0.1:5432/cookbook` with user and password `cookbook`.

Login uses WorkOS AuthKit when `WORKOS_CLIENT_ID` and `WORKOS_API_KEY` are set. The redirect URI defaults to `http://localhost:3000/api/v1/auth/callback`. Recipe reads stay public. Recipe writes need the session cookie.

### Run

- Server: `devenv --profile server up` or `gradle :apps:api:runDebugExecutableNative`
- Web: `devenv --profile web up` or `pnpm --filter web dev`
- JS check: `pnpm exec vp check`
- API client: `pnpm --filter web generate-api` (API on `:8080`)
- Tests: `gradle test`

See [docs/AGENTS.md](docs/AGENTS.md).
