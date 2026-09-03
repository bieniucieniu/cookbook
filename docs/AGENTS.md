# Agent instructions

Monorepo: Gradle (Kotlin JVM) + pnpm (JS). JVM API at repo-root `server/`; JS apps under `apps/`.

```
server/     JVM Ktor CIO             Gradle `:server`
apps/
  web       React + Vite             pnpm `web`
packages/
  core      Kotlin JVM shared lib    Gradle `:packages:core`
```

New JS app → `apps/<name>`. JVM API stays `server/`. New shared lib → `packages/<name>`.

## Tooling

Use [devenv](https://devenv.sh). `devenv shell` or `direnv allow`.

| Tool | Source | Do not use |
| --- | --- | --- |
| JDK 25, Gradle 9, Node, pnpm 11, Postgres | `devenv.nix` | `./gradlew`, Corepack, `packageManager` field, Netty |

Postgres: `devenv up` (or a profile that starts it). URL `postgresql://127.0.0.1:5432/cookbook`, user/password `cookbook`.

Server config: `server/src/main/resources/application.yaml` (Ktor `EngineMain`). Env (do not commit secrets):

| Var | Required | Notes |
| --- | --- | --- |
| `WORKOS_API_KEY` | yes | WorkOS secret `sk_*` |
| `WORKOS_CLIENT_ID` | yes | User Management client id |
| `WORKOS_COOKIE_PASSWORD` | yes | 32+ chars; session cookie |
| `WORKOS_COOKIE_SECURE` | no | `true` in prod; off on localhost |
| `DATABASE_URL` | no | default `postgresql://127.0.0.1:5432/cookbook` |
| `DATABASE_USER` / `DATABASE_PASSWORD` | no | default `cookbook` |

Commands:

- Server: `devenv --profile server up` (Postgres + JVM Ktor CIO on `:8080`)
- Web: `devenv --profile web up` (extends server; Vite on `:3000`, proxies `/api` → `:8080`)
- All: `devenv --profile all up` (same as web)
- Manual: `gradle :server:run` / `pnpm --filter web dev`
- Tests: `gradle test`
- JS install: on devenv enter (`languages.javascript.pnpm.install.enable`)
- API client: `pnpm --filter web generate-api` (Orval; spec at `server/src/main/resources/swagger/documentation.yaml`, also `GET /swagger/documentation.yaml`)

## Version catalogs

Never pin versions in app/package `build.gradle.kts` or workspace `package.json` files. Catalog only.

### JVM — `gradle/libs.versions.toml`

```kotlin
implementation(libs.ktor.serverCio)
implementation(libs.ktor.serverConfigYaml)
implementation(libs.workos)
implementation(libs.hikari)
implementation(libs.postgresql)
alias(libs.plugins.kotlinJvm)
alias(libs.plugins.ktor)
```

Add version → `[versions]`. Add dep → `[libraries]` or `[plugins]`. Then `libs.*`.

Gradle module: `include(":server")` or `include(":packages:foo")` in `settings.gradle.kts`. Path = project path (`:packages:foo` → `packages/foo`).

Server layout (same as zula): `app/`, `core/`, `features/`, `lib/` under `server/src/main/kotlin` (packages `com.bieniucieniu.cookbook.*`, no `com/...` dirs). DB: Hikari + JDBC Postgres. Migrations in `server/db/migrations` (ordered `.sql` on startup). No sqlx4k, no KSP, no Native.

Auth: WorkOS User Management (`com.workos:workos`). httpOnly `wos-session` cookie. `/` and `/health` public; `/recipes` and `/auth/me` require session. No live WorkOS in CI. OpenAPI: `server/src/main/resources/swagger/documentation.yaml` (served at `/swagger/documentation.yaml`). Web client: Orval + TanStack Query (`apps/web/orval.config.ts`, `src/mutator.ts`, generated `src/generated/`).

### JS — pnpm catalog in `pnpm-workspace.yaml`

```json
"react": "catalog:"
```

Add version under `catalog:` in `pnpm-workspace.yaml`. `catalogMode: strict` — `pnpm add` without a catalog entry fails. Then `catalog:` in that package's `package.json`.

Workspace globs: `apps/*`, `packages/*`. Only dirs with `package.json` are pnpm packages. Kotlin dirs stay Gradle-only.

Internal JS packages: `"@cookbook/foo": "workspace:*"`. Name `@cookbook/<dir>`. App `apps/web` package name is `web`.

## Conventions

- JVM group: `com.bieniucieniu.cookbook`
- JS scope: `@cookbook`
- Do not add Gradle wrapper or Corepack
- UI change: verify in browser, not screenshot-only
- Do not invent extra packages
