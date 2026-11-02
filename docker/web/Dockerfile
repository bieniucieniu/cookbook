# syntax=docker/dockerfile:1
# Multi-arch: linux/amd64 + linux/arm64.
# Build the SPA on $BUILDPLATFORM, then copy dist into per-arch nginx.

ARG NODE_IMAGE=node:24-bookworm-slim
ARG NGINX_IMAGE=nginxinc/nginx-unprivileged:1.27-alpine

FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS build
WORKDIR /workspace

ENV CI=true

RUN npm install -g pnpm@11

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile

COPY apps/web ./apps/web
RUN pnpm --filter web build

FROM ${NGINX_IMAGE} AS runtime

COPY docker/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html

EXPOSE 8080
