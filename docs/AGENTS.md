# Agent instructions

Monorepo: Gradle (Kotlin/Native) + pnpm (JS). Native API at `apps/api`; JS apps under `apps/`.

```
apps/
  api       Kotlin/Native Ktor CIO   Gradle `:apps:api`
  web       Solid + TanStack Router  Vite+  pnpm `web`
packages/
  core      Kotlin/Native shared lib Gradle `:packages:core`
  workos    Native WorkOS client     Gradle `:packages:workos`
  s3        Native S3 client         Gradle `:packages:s3`
  storybook Solid Storybook          scans the monorepo  pnpm `@cookbook/storybook`
```

New JS app → `apps/<name>`. API stays `apps/api`. New shared lib → `packages/<name>`. `:packages:workos` is the WorkOS client. `:packages:s3` is the Native stand-in for `aws.sdk.kotlin:s3`.

## Tooling

Use [devenv](https://devenv.sh). `devenv shell` or `direnv allow`.

| Tool                                                   | Source       | Do not use                                                       |
| ------------------------------------------------------ | ------------ | ---------------------------------------------------------------- |
| JDK 25, Gradle 9, Node, pnpm 11, Postgres, Xcode clang | `devenv.nix` | `./gradlew`, Corepack, `packageManager` field, Netty, JVM server |

Kotlin/Native links with Xcode `clang`. devenv unsets `DEVELOPER_DIR` and `SDKROOT` so `xcrun` does not pick the Nix clang wrapper.

Postgres: `devenv up` (or a profile that starts it). URL `postgresql://127.0.0.1:5432/cookbook`, user/password `cookbook`.

Server config: env read in `apps/api` (`embeddedServer(CIO)`). Env (do not commit secrets):

| Var                                   | Required  | Notes                                                                                                                                                                                                  |
| ------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                        | no        | default `postgresql://127.0.0.1:5432/cookbook`                                                                                                                                                         |
| `DATABASE_USER` / `DATABASE_PASSWORD` | no        | default `cookbook`                                                                                                                                                                                     |
| `DATABASE_MAX_POOL_SIZE`              | no        | default `10`                                                                                                                                                                                           |
| `AUTO_MIGRATE`                        | no        | default `true`                                                                                                                                                                                         |
| `DATABASE_MIGRATIONS`                 | no        | default `apps/api/db/migrations`                                                                                                                                                                       |
| `WORKOS_CLIENT_ID`                    | for login | AuthKit client id                                                                                                                                                                                      |
| `WORKOS_API_KEY`                      | for login | WorkOS secret key. Login returns 503 when this or the client id is missing                                                                                                                             |
| `WORKOS_REDIRECT_URI`                 | no        | default `http://localhost:3000/api/v1/auth/callback`                                                                                                                                                   |
| `WORKOS_LOGOUT_RETURN_TO`             | no        | default `http://localhost:3000/`                                                                                                                                                                       |
| `WORKOS_API_BASE_URL`                 | no        | default `https://api.workos.com`                                                                                                                                                                       |
| `WORKOS_AUTHKIT_DOMAIN`               | for mcp   | AuthKit issuer, no trailing slash. `POST /api/v1/mcp` returns 503 when this, the client id, or the API key is missing                                                                                  |
| `MCP_RESOURCE_URL`                    | no        | default `http://127.0.0.1:8080/api/v1/mcp`. Access token `aud` must equal this string. Register it as a WorkOS Resource Indicator and set it as the default. Enable Client ID Metadata Documents       |
| `SESSION_TTL_SECONDS`                 | no        | default 7 days                                                                                                                                                                                         |
| `AGENT_TOKEN`                         | for agent | `Authorization: Bearer` maps to user `agent_local` / `agent@localhost`. The seed creates that user. A missing or wrong token does not open a session. This is the direct API bearer, not the MCP login |
| `S3_ENDPOINT`                         | no        | default `http://127.0.0.1:8333`                                                                                                                                                                        |
| `S3_BUCKET`                           | no        | default `cookbook`                                                                                                                                                                                     |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY`     | no        | default `cookbook`                                                                                                                                                                                     |
| `PHOTO_MAX_BYTES`                     | no        | default `5242880`. Larger uploads return 400 before `putObject`                                                                                                                                        |

Commands:

- Server: `devenv --profile server up` (Postgres + SeaweedFS + Native Ktor CIO on `:8080`)
- Web only: `devenv tasks run web:dev` (Vite on `:3000`)
- Web: `devenv --profile web up` (Postgres + SeaweedFS + API + Vite on `:3000`, proxies `/api` → `:8080` unchanged)
- Storybook only: `devenv tasks run storybook:dev` (Storybook on `:6006`)
- Storybook: `devenv --profile storybook up` (Storybook process on `:6006`; Postgres and SeaweedFS still start)
- Web + Storybook: `devenv --profile web --profile storybook up` (`:3000` and `:6006`)
- All: `devenv --profile all up` (same as web)
- Manual: `gradle :apps:api:runDebugExecutableNative` / `pnpm --filter web dev`
- Seed: `gradle :apps:api:seed` (debug binary arg `seed`; needs Postgres and the S3 gateway; does not start the HTTP server)
- Dev SQL seed: `apps/api/db/seed.sql` runs with `0001_init.sql` through devenv `initialSQL` when Postgres first creates `.devenv/state/postgres`. To reseed, stop devenv, delete that dir, and run `devenv up`. Keep it in step with `features/seed/Seed.kt` (it skips the photo)
- Tests: `gradle test` (`nativeTest` on `:apps:api`, `:packages:core`, `:packages:workos`, and `:packages:s3`)
- JS install: on devenv enter (`languages.javascript.pnpm.install.enable`)
- JS check: `pnpm exec vp check` (Oxfmt, Oxlint, typecheck). Dev and build stay `pnpm --filter web dev` / `build`. Those scripts call `vp`.
- API client: `pnpm --filter web generate-api` (Orval, `client: solid-query`). Needs the API up. Reads `GET /api/v1/swagger/documentation.json`.

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

Server layout: `app/`, `core/`, `features/`, `lib/` under `apps/api/src/nativeMain/kotlin` (packages `com.bieniucieniu.cookbook.*`, no `com/...` dirs). Host-only Kotlin/Native target named `native` (`embeddedServer` + CIO). DB: sqlx4k Postgres pool + SQLDelight (`generateAsync`, postgres dialect). `.sq` files live in `apps/api/src/commonMain/sqldelight` (SQLDelight 2 only generates from `commonMain`). Migrations: ordered `.sql` in `apps/api/db/migrations`, applied with sqlx4k `migrate()` on startup. No Hikari, no JDBC, no KSP. Do not add the official WorkOS SDK. It is JVM and OkHttp. Do not add `aws.sdk.kotlin:s3`. It is JVM.

`:packages:workos` mirrors the official SDK names for `userManagement`, `organizations`, `organizationMembership`, `sso`, `events`, and `auditLogs`, plus `Webhook.constructEvent`. The official artifact is JVM and OkHttp, so this package does not vendor it and does not generate the rest of the OpenAPI surface (directory sync, vault, pipes, widgets, radar, FGA). Methods are suspend. `:packages:s3` mirrors `putObject`, `getObject`, and `deleteObject` with path-style SigV4 and a `ByteArray` body. Both packages take a caller-owned Ktor `HttpClient` and do not construct or close it. `:apps:api` builds one `HttpClient(Curl)` and passes it to WorkOS and `S3Client`. The API closes that client on shutdown. Native CIO cannot open TLS, and WorkOS is HTTPS. `WorkOS.close()` does not close the shared client. Session rows and recipe grants stay in Postgres. The owner grants `read` or `write`. Delete and grant stay with the owner. A `private` recipe is hidden. A `public` recipe stays readable without a session. Recipe writes require a session. `AGENT_TOKEN` is a bearer session for `agent_local`. `POST /api/v1/mcp` is the remote MCP endpoint: one JSON-RPC body per request, JSON response, WorkOS AuthKit OAuth. Cursor points at `http://127.0.0.1:8080/api/v1/mcp` with no local process and no `AGENT_TOKEN`. The access token is an AuthKit RS256 JWT, verified in the API against `{WORKOS_AUTHKIT_DOMAIN}/oauth2/jwks` (issuer, `aud` = `MCP_RESOURCE_URL`, expiry; `features/mcp/AccessToken.kt`, cryptography-kotlin with prebuilt OpenSSL). There is no token introspection. In WorkOS, enable Client ID Metadata Documents and Dynamic Client Registration so MCP clients register themselves; no client id or secret goes in the client config. The signed-in WorkOS user is upserted and the tool runs as that user. Catalog stays open. Photos go to the SeaweedFS bucket `cookbook` at `photos/{storageKey}`. The browser talks to the API, not S3.

## API versions

Every endpoint is under a version prefix: `/api/v1/...` (`ApiVersion.V1` in `apps/api/src/nativeMain/kotlin/app/ApiVersion.kt`). `app/Routing.kt` mounts each feature inside `route(ApiVersion.V1)`. Only `/.well-known/oauth-*` stays at the host root, because OAuth discovery looks there. A breaking change ships as a new prefix (`/api/v2`) mounted next to v1, with its own `configureOpenApiRouting()`, so v1 clients keep working. Paths below are relative to the version prefix.

`/`, `/health`, public recipe reads, `GET /photos/{id}` for a public recipe, and catalog reads and writes are public. `/auth/*`, recipe writes, `POST /photos`, step comments, and `/recipes/{id}/grants` are not. OpenAPI is built at runtime from route `.describe {}` metadata (`ktor-server-routing-openapi`) and served as JSON at `GET /api/v1/swagger/documentation.json`. Each version's document lists only that version's routes. Native has no YAML serializer. That document is the cookbook API. Web generates a client from it with Orval (`apps/web/orval.config.ts`, `client: solid-query`). UI comes from the [solid-kit](https://github.com/bieniucieniu/solid-kit) shadcn registry (`apps/web/components.json`), not an npm import. Web is a client-only Solid SPA on TanStack Router and TanStack Query. Vite+ (`vp`) is the JS toolchain: dev, build, format, lint. Root `vite.config.ts` owns `lint` and `fmt`. Before editing `apps/web`, read [apps/web/AGENTS.md](../apps/web/AGENTS.md). JSX looks like React. Components run once and updates are fine-grained. Do not write React.

### JS — pnpm catalog in `pnpm-workspace.yaml`

```json
"solid-js": "catalog:"
```

Add version under `catalog:` in `pnpm-workspace.yaml`. `catalogMode: strict` — `pnpm add` without a catalog entry fails. Then `catalog:` in that package's `package.json`.

Workspace globs: `apps/*`, `packages/*`. Only dirs with `package.json` are pnpm packages. Kotlin dirs stay Gradle-only.

Internal JS packages: `"@cookbook/foo": "workspace:*"`. Name `@cookbook/<dir>`. App `apps/web` package name is `web`.

## Recipes

Step graph, ingredient and tool dictionaries, alternatives, search facts, and timing: [recipes.md](recipes.md). One migration (`0001_init.sql`); reset the database instead of adding migrations. Live tables include `recipes` (`description`, `notes`, `visibility`, `owner_id`), the step graph (`recipe_nodes.key`), step swaps (`node_ingredient_alts`, `node_tool_alts`), `recipe_photos`, and `recipe_step_comments` (keyed by `recipe_id` + `step_key`). SeaweedFS (`weed mini`, data dir `.devenv/state/seaweed`, volume port `8081`, S3 port `8333`, identity `cookbook` / `cookbook`) starts with devenv. The server profile starts after Postgres and SeaweedFS. Ready check is `GET :9333/cluster/status`.

## Conventions

- JVM group: `com.bieniucieniu.cookbook`
- JS scope: `@cookbook`
- Do not add Gradle wrapper or Corepack
- UI change: verify in browser, not screenshot-only
- Do not invent extra packages
