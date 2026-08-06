# Plate Runner web frontend — static build served by nginx.
FROM node:22-bookworm-slim AS build

WORKDIR /workspace
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/web/package.json apps/web/package.json

RUN pnpm install --frozen-lockfile --filter web...

COPY packages/shared packages/shared
COPY apps/web apps/web

RUN pnpm --filter web build

FROM nginx:alpine
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
EXPOSE 80
