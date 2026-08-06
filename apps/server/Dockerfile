# Plate Runner backend server — local API + command queue.
# node:22-bookworm-slim (glibc, not alpine) minimizes native-module friction for
# better-sqlite3's prebuilt binaries, and matches the pnpm version pinned via
# packageManager (pnpm 11.x requires Node >= 22.13). No build stage: apps/server
# runs via tsx (see docs/BACKEND_API_SPEC.md "Runtime choice"), same as
# packages/shared is consumed as raw TS by apps/web via Vite.
FROM node:22-bookworm-slim

WORKDIR /workspace

RUN corepack enable

# Copy just the workspace manifests first for better layer caching.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/server/package.json apps/server/package.json

RUN pnpm install --frozen-lockfile --filter server...

# Now copy the actual source.
COPY packages/shared packages/shared
COPY apps/server apps/server

ENV NODE_ENV=production
ENV PLATE_RUNNER_SERVER_PORT=8787
ENV PLATE_RUNNER_STORAGE_PATH=/data

EXPOSE 8787

CMD ["pnpm", "--filter", "server", "start"]
