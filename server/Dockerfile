# Build context: repository root
#   docker build -f server/Dockerfile -t longrak-server .

FROM node:22-slim AS build
WORKDIR /repo
ENV NODE_ENV=production

# Install only this workspace's dependencies from the root lockfile
COPY package.json package-lock.json ./
COPY app/package.json app/
COPY web/package.json web/
COPY server/package.json server/
RUN npm ci -w server --ignore-scripts --no-audit --no-fund

COPY server ./server
RUN npm run build -w server

# --- Runtime ---
FROM node:22-slim AS runtime
WORKDIR /repo
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=1337

COPY --from=build --chown=node:node /repo/package.json ./package.json
COPY --from=build --chown=node:node /repo/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/server ./server

WORKDIR /repo/server
USER node
EXPOSE 1337
CMD ["npm", "run", "start"]
