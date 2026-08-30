# Agent instructions

Monorepo: Gradle (Kotlin/Native + JVM tooling) + pnpm (JS). Same layout for both.

```
apps/
  server    Kotlin/Native Ktor CIO   Gradle `:apps:server`
  web       React + Vite             pnpm `@cookbook/web`
packages/
  core      Kotlin/Native shared lib Gradle `:packages:core`
```

New runnable thing → `apps/<name>`. New shared lib → `packages/<name>`.

## Tooling

Use [devenv](https://devenv.sh). `devenv shell` or `direnv allow`.

| Tool | Source | Do not use |
| --- | --- | --- |
| JDK 25, Gradle 9, Node 22, pnpm 11, Postgres | `devenv.nix` | `./gradlew`, Corepack, `packageManager` field, Netty |

Postgres: `devenv up` (or a profile that starts it). URL `postgresql://127.0.0.1:5432/cookbook`, user/password `cookbook`.

Commands:

- Server: `devenv --profile server up` (Postgres + Native CIO on `:8080`)
- Web: `devenv --profile web up` (extends server; Vite on `:5173`)
- All: `devenv --profile all up` (same as web)
- Manual: `gradle :apps:server:run` / `pnpm --filter @cookbook/web dev`
- Tests: `gradle test`
- JS install: on devenv enter (`languages.javascript.pnpm.install.enable`)

## Version catalogs

Never pin versions in app/package `build.gradle.kts` or workspace `package.json` files. Catalog only.

### JVM/Native — `gradle/libs.versions.toml`

```kotlin
implementation(libs.ktor.serverCio)
implementation(libs.sqlx4k.postgres)
alias(libs.plugins.kotlinMultiplatform)
alias(libs.plugins.ksp)
```

Add version → `[versions]`. Add dep → `[libraries]` or `[plugins]`. Then `libs.*`.

Gradle module: `include(":apps:foo")` or `include(":packages:foo")` in `settings.gradle.kts`. Path = project path (`:packages:core` → `packages/core`).

Server DB: sqlx4k `@Repository` + KSP (`kspMacosArm64` / host target, not common metadata). Migrations in `apps/server/db/migrations`. No SQLDelight.

### JS — pnpm catalog in `pnpm-workspace.yaml`

```json
"react": "catalog:"
```

Add version under `catalog:` in `pnpm-workspace.yaml`. `catalogMode: strict` — `pnpm add` without a catalog entry fails. Then `catalog:` in that package's `package.json`.

Workspace globs: `apps/*`, `packages/*`. Only dirs with `package.json` are pnpm packages. Kotlin dirs stay Gradle-only.

Internal JS packages: `"@cookbook/foo": "workspace:*"`. Name `@cookbook/<dir>`.

## Conventions

- JVM/Native group: `com.bieniucieniu.cookbook`
- JS scope: `@cookbook`
- Do not add Gradle wrapper or Corepack
- UI change: verify in browser, not screenshot-only
- Do not invent extra packages
