FROM node:24-alpine AS build
WORKDIR /workspace
RUN corepack enable
ARG PUBLIC_API_BASE_URL=http://localhost:3000
ENV PUBLIC_API_BASE_URL=$PUBLIC_API_BASE_URL
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile --filter @srm/web...
COPY apps/web ./apps/web
RUN pnpm --filter @srm/web build

FROM nginx:1.29-alpine
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
EXPOSE 80
