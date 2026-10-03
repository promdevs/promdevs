FROM node:24-bookworm-slim AS build
WORKDIR /repo
RUN npm install --global pnpm@10.32.1
COPY . .
RUN pnpm install --frozen-lockfile && pnpm build:admin

FROM nginx:stable-alpine AS runtime
RUN apk add --no-cache ca-certificates
ENV API_UPSTREAM=http://api:4000
COPY deploy/admin.nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /repo/apps/admin/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s CMD wget -q -O /dev/null http://127.0.0.1/health
