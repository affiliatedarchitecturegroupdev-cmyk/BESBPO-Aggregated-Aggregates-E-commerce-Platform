FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/database/package.json packages/database/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @aggregates/database db:generate
RUN pnpm --filter api build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
