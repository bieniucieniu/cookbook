Gradle multi-project + pnpm workspace. Tooling via [devenv](https://devenv.sh).

```
apps/
  server   Kotlin Ktor
  web      React (Vite)
packages/
  core     Kotlin JVM shared lib
```

### Env

```
devenv shell
# or: direnv allow
```

Provides JDK 25, Gradle 9, Node 22, pnpm 11. No `./gradlew`, no Corepack.

### Run

- Server: `gradle :apps:server:run`
- Web: `pnpm --filter @cookbook/web dev`
- Tests: `gradle test`
