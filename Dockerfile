FROM node:18-alpine AS base
RUN npm i -g pnpm

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install
RUN pnpm build

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/dist/ ./dist/
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --prod
CMD [ "pnpm", "start" ]