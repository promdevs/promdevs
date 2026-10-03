FROM node:24-bookworm-slim AS build
WORKDIR /repo
RUN npm install --global pnpm@10.32.1
COPY . .
RUN pnpm install --frozen-lockfile && pnpm build:api && pnpm --filter @promdevs/api deploy --prod /out/api

FROM node:24-bookworm-slim AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production PORT=4000 HOST=0.0.0.0
COPY --from=build --chown=node:node /out/api ./
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD curl --fail --silent --show-error --max-time 4 http://127.0.0.1:4000/health > /dev/null
CMD ["node", "dist/index.js"]
