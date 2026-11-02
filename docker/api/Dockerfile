# syntax=docker/dockerfile:1
# Build on the target architecture. Kotlin/Native uses the host target, so do
# not compile this image under QEMU.

FROM eclipse-temurin:25-jdk AS build

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl unzip libcurl4-openssl-dev \
    && rm -rf /var/lib/apt/lists/*

ARG GRADLE_VERSION=9.8.2
RUN curl -fsSL "https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip" -o /tmp/gradle.zip \
    && unzip -q /tmp/gradle.zip -d /opt \
    && ln -s "/opt/gradle-${GRADLE_VERSION}/bin/gradle" /usr/local/bin/gradle \
    && rm /tmp/gradle.zip

WORKDIR /src

COPY settings.gradle.kts build.gradle.kts gradle.properties ./
COPY gradle/libs.versions.toml gradle/libs.versions.toml
COPY apps/api/build.gradle.kts apps/api/build.gradle.kts
COPY packages/core/build.gradle.kts packages/core/build.gradle.kts
COPY packages/workos/build.gradle.kts packages/workos/build.gradle.kts
COPY packages/s3/build.gradle.kts packages/s3/build.gradle.kts
COPY apps/api apps/api
COPY packages packages

RUN gradle :apps:api:linkReleaseExecutableNative --no-daemon

FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates libcurl4 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 65532 cookbook \
    && useradd --system --uid 65532 --gid 65532 --home-dir /app --no-create-home --shell /usr/sbin/nologin cookbook

WORKDIR /app

COPY --from=build --chown=65532:65532 /src/apps/api/build/bin/native/releaseExecutable/api.kexe /usr/local/bin/cookbook
COPY --chown=65532:65532 apps/api/db/migrations /app/db/migrations

RUN chmod 755 /usr/local/bin/cookbook \
    && ldd /usr/local/bin/cookbook \
    && ! ldd /usr/local/bin/cookbook | grep -q 'not found'

USER 65532:65532

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/cookbook"]
