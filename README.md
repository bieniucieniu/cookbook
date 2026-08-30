Gradle multi-project + pnpm workspace. Tooling via [devenv](https://devenv.sh).

```
apps/
  server   Kotlin/Native Ktor (CIO) + sqlx4k
  web      React (Vite)
packages/
  core     Kotlin/Native shared lib
```

### Env

```
devenv shell
# or: direnv allow
devenv --profile server up   # Postgres + Ktor :8080
devenv --profile web up     # + Vite :5173
devenv --profile all up     # same as web
```

Provides JDK 25, Gradle 9, Node 22, pnpm 11, Postgres. No `./gradlew`, no Corepack.

### Run

- Server: `devenv --profile server up`
- Web: `devenv --profile web up`
- Tests: `gradle test`

See [docs/AGENTS.md](docs/AGENTS.md).
