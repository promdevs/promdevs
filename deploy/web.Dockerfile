FROM node:24-bookworm-slim AS build
WORKDIR /repo
RUN npm install --global pnpm@10.32.1
COPY . .
RUN pnpm install --frozen-lockfile && pnpm build:web

FROM node:24-bookworm-slim AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s CMD curl --fail --silent --show-error --max-time 8 http://127.0.0.1:3000/ > /dev/null
CMD ["node", "apps/web/server.js"]
