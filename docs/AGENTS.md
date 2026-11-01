# Agent instructions

Monorepo: Gradle (Kotlin/Native) + pnpm (JS). Native API at `apps/api`; JS apps under `apps/`.

```
apps/
  api       Kotlin/Native Ktor CIO   Gradle `:apps:api`
  web       Solid + TanStack Router  pnpm `web`
packages/
  core      Kotlin/Native shared lib Gradle `:packages:core`
```

New JS app → `apps/<name>`. API stays `apps/api`. New shared lib → `packages/<name>`. `:packages:workos` is the WorkOS client.

## Tooling

Use [devenv](https://devenv.sh). `devenv shell` or `direnv allow`.

| Tool | Source | Do not use |
| --- | --- | --- |
| JDK 25, Gradle 9, Node, pnpm 11, Postgres, Xcode clang | `devenv.nix` | `./gradlew`, Corepack, `packageManager` field, Netty, JVM server |

Kotlin/Native links with Xcode `clang`. devenv unsets `DEVELOPER_DIR` and `SDKROOT` so `xcrun` does not pick the Nix clang wrapper.

Postgres: `devenv up` (or a profile that starts it). URL `postgresql://127.0.0.1:5432/cookbook`, user/password `cookbook`.

Server config: env read in `apps/api` (`embeddedServer(CIO)`). Env (do not commit secrets):

| Var | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | no | default `postgresql://127.0.0.1:5432/cookbook` |
| `DATABASE_USER` / `DATABASE_PASSWORD` | no | default `cookbook` |
| `DATABASE_MAX_POOL_SIZE` | no | default `10` |
| `AUTO_MIGRATE` | no | default `true` |
| `DATABASE_MIGRATIONS` | no | default `apps/api/db/migrations` |
| `WORKOS_CLIENT_ID` | for login | AuthKit client id |
| `WORKOS_API_KEY` | for login | WorkOS secret key. Login returns 503 when this or the client id is missing |
| `WORKOS_REDIRECT_URI` | no | default `http://localhost:3000/api/auth/callback` |
| `WORKOS_LOGOUT_RETURN_TO` | no | default `http://localhost:3000/` |
| `WORKOS_API_BASE_URL` | no | default `https://api.workos.com` |
| `SESSION_TTL_SECONDS` | no | default 7 days |

Commands:

- Server: `devenv --profile server up` (Postgres + Native Ktor CIO on `:8080`)
- Web: `devenv --profile web up` (extends server; Vite on `:3000`, proxies `/api` → `:8080`)
- All: `devenv --profile all up` (same as web)
- Manual: `gradle :apps:api:runDebugExecutableNative` / `pnpm --filter web dev`
- Tests: `gradle test` (`nativeTest` on `:apps:api` and `:packages:core`)
- JS install: on devenv enter (`languages.javascript.pnpm.install.enable`)

## Version catalogs

Never pin versions in app/package `build.gradle.kts` or workspace `package.json` files. Catalog only.

### JVM — `gradle/libs.versions.toml`

```kotlin
implementation(libs.ktor.serverCio)
implementation(libs.sqlx4k.postgres)
implementation(libs.sqlx4k.sqldelight)
alias(libs.plugins.kotlinMultiplatform)
alias(libs.plugins.sqldelight)
```

Add version → `[versions]`. Add dep → `[libraries]` or `[plugins]`. Then `libs.*`.

Gradle module: `include(":apps:api")` or `include(":packages:foo")` in `settings.gradle.kts`. Path = project path (`:packages:foo` → `packages/foo`).

Server layout: `app/`, `core/`, `features/`, `lib/` under `apps/api/src/nativeMain/kotlin` (packages `com.bieniucieniu.cookbook.*`, no `com/...` dirs). Host-only Kotlin/Native target named `native` (`embeddedServer` + CIO). DB: sqlx4k Postgres pool + SQLDelight (`generateAsync`, postgres dialect). `.sq` files live in `apps/api/src/commonMain/sqldelight` (SQLDelight 2 only generates from `commonMain`). Migrations: ordered `.sql` in `apps/api/db/migrations`, applied with sqlx4k `migrate()` on startup. No Hikari, no JDBC, no KSP. Do not add the official WorkOS SDK. It is JVM and OkHttp.

`:packages:workos` mirrors the official SDK names for `userManagement`, `organizations`, `organizationMembership`, `sso`, `events`, and `auditLogs`, plus `Webhook.constructEvent`. The official artifact is JVM and OkHttp, so this package does not vendor it and does not generate the rest of the OpenAPI surface (directory sync, vault, pipes, widgets, radar, FGA). Methods are suspend. The caller passes a Ktor `HttpClientEngine`. `:apps:api` passes CIO. Session rows and recipe grants stay in Postgres. The owner grants `read` or `write`. Delete and grant stay with the owner. A `private` recipe is hidden. A `public` recipe stays readable without a session. Recipe writes require a session. Catalog stays open.

`/`, `/health`, public recipe reads, and catalog reads and writes are public. `/auth/*`, recipe writes, and `/recipes/{id}/grants` are not. OpenAPI is built at runtime from route `.describe {}` metadata (`ktor-server-routing-openapi`) and served as JSON at `GET /swagger/documentation.json`. Native has no YAML serializer. That document is the cookbook API, not a generated client. Web is a client-only Solid SPA (`@tanstack/solid-router`). Before editing `apps/web`, read [apps/web/AGENTS.md](../apps/web/AGENTS.md). JSX looks like React. Components run once and updates are fine-grained. Do not write React.

### JS — pnpm catalog in `pnpm-workspace.yaml`

```json
"solid-js": "catalog:"
```

Add version under `catalog:` in `pnpm-workspace.yaml`. `catalogMode: strict` — `pnpm add` without a catalog entry fails. Then `catalog:` in that package's `package.json`.

Workspace globs: `apps/*`, `packages/*`. Only dirs with `package.json` are pnpm packages. Kotlin dirs stay Gradle-only.

Internal JS packages: `"@cookbook/foo": "workspace:*"`. Name `@cookbook/<dir>`. App `apps/web` package name is `web`.

## Recipes

Step graph, ingredient and tool dictionaries, alternatives, search facts, and timing: [recipes.md](recipes.md). Design only. The live table is `recipes(id, title)`.

## Conventions

- JVM group: `com.bieniucieniu.cookbook`
- JS scope: `@cookbook`
- Do not add Gradle wrapper or Corepack
- UI change: verify in browser, not screenshot-only
- Do not invent extra packages
