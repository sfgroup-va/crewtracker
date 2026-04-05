FROM node:20-alpine AS base
RUN corepack enable && corepack prepare bun@latest --activate

# --- Production Stage ---
FROM base AS production
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production=false
COPY . .
COPY --from=base /root/.bun/install/global/node_modules/bun /root/.bun/install/global/node_modules/bun
EXPOSE 3000
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
CMD ["bun", "run", "start"]
