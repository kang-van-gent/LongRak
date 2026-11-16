# Build context: repository root
#   docker build -f app/Dockerfile -t longrak-app .

FROM node:22-slim AS build
WORKDIR /repo

# Install only this workspace's dependencies from the root lockfile
COPY package.json package-lock.json ./
COPY app/package.json app/
COPY web/package.json web/
COPY server/package.json server/
RUN npm ci -w app --ignore-scripts --no-audit --no-fund

COPY app ./app
RUN npm run build -w app

# --- Runtime: Nuxt's .output is self-contained ---
FROM node:22-slim AS runtime
WORKDIR /srv
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
COPY --from=build --chown=node:node /repo/app/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
