# syntax=docker/dockerfile:1
# The Kotlin/Native compiler runs on linux/amd64, not linux/arm64.
# Cross-compile linuxArm64 from the amd64 build stage. QEMU is only for the
# runtime image's package install.

FROM --platform=$BUILDPLATFORM eclipse-temurin:25-jdk AS build

ARG TARGETARCH
ARG GRADLE_VERSION=9.8.2

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl unzip \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL "https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip" -o /tmp/gradle.zip \
    && unzip -q /tmp/gradle.zip -d /opt \
    && ln -s "/opt/gradle-${GRADLE_VERSION}/bin/gradle" /usr/local/bin/gradle \
    && rm /tmp/gradle.zip

RUN set -eux; \
    if [ "$TARGETARCH" = "arm64" ]; then \
      dpkg --add-architecture arm64; \
      apt-get update; \
      apt-get install -y --no-install-recommends libcurl4:arm64; \
      ln -sf libcurl.so.4 /usr/lib/aarch64-linux-gnu/libcurl.so; \
    else \
      apt-get update; \
      apt-get install -y --no-install-recommends libcurl4-openssl-dev; \
    fi; \
    rm -rf /var/lib/apt/lists/*

WORKDIR /src

COPY settings.gradle.kts build.gradle.kts gradle.properties ./
COPY gradle/libs.versions.toml gradle/libs.versions.toml
COPY apps/api/build.gradle.kts apps/api/build.gradle.kts
COPY packages/core/build.gradle.kts packages/core/build.gradle.kts
COPY packages/workos/build.gradle.kts packages/workos/build.gradle.kts
COPY packages/s3/build.gradle.kts packages/s3/build.gradle.kts
COPY apps/api apps/api
COPY packages packages

RUN set -eux; \
    case "$TARGETARCH" in \
      amd64) native_target=linuxX64 ;; \
      arm64) native_target=linuxArm64 ;; \
      *) echo "unsupported TARGETARCH=$TARGETARCH" >&2; exit 1 ;; \
    esac; \
    gradle :apps:api:linkReleaseExecutableNative --no-daemon -Pnative.target="$native_target"; \
    test -x apps/api/build/bin/native/releaseExecutable/api.kexe

FROM --platform=$TARGETPLATFORM ubuntu:24.04

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
