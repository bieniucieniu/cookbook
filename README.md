Gradle multi-project + pnpm workspace. Tooling via [devenv](https://devenv.sh).

```
server/    JVM Ktor (CIO) + JDBC Postgres + WorkOS
apps/web   React (Vite) on :3000, proxies /api → :8080
packages/core  Kotlin JVM shared lib
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

Server reads `server/src/main/resources/application.yaml`. Needs `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `WORKOS_COOKIE_PASSWORD` (32+ chars). Optional `WORKOS_COOKIE_SECURE=true` in production.

### Run

- Server: `devenv --profile server up` or `gradle :server:run`
- Web: `devenv --profile web up` or `pnpm --filter web dev`
- Tests: `gradle test`
- API client: `pnpm --filter web generate-api`

See [docs/AGENTS.md](docs/AGENTS.md).
