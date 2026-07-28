FROM node:24-alpine AS build
WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-workspace.yaml tsconfig.base.json pnpm-lock.yaml ./
COPY packages/api-schema/package.json packages/api-schema/index.js packages/api-schema/index.d.ts ./packages/api-schema/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile --filter @srm/api...
COPY apps/api ./apps/api
RUN pnpm --filter @srm/api build

FROM node:24-alpine AS runtime
WORKDIR /workspace
ENV NODE_ENV=production
RUN corepack enable
COPY --from=build /workspace/package.json /workspace/pnpm-workspace.yaml ./
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/packages ./packages
COPY --from=build /workspace/apps/api/package.json ./apps/api/package.json
COPY --from=build /workspace/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /workspace/apps/api/dist ./apps/api/dist
EXPOSE 3000
CMD ["node", "apps/api/dist/server.js"]
