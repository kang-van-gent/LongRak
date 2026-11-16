# Build context: repository root
#   docker build -f web/Dockerfile -t longrak-web .

FROM node:22-slim AS build
WORKDIR /repo

# Install only this workspace's dependencies from the root lockfile
COPY package.json package-lock.json ./
COPY app/package.json app/
COPY web/package.json web/
COPY server/package.json server/
RUN npm ci -w web --ignore-scripts --no-audit --no-fund

COPY web ./web
RUN npm run build -w web

# --- Runtime: Nuxt's .output is self-contained ---
FROM node:22-slim AS runtime
WORKDIR /srv
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
COPY --from=build --chown=node:node /repo/web/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
