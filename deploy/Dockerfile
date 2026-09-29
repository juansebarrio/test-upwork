# Optional container build. The systemd unit is the primary deployment path;
# use this if you prefer Docker. The database lives in the /data volume.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim
ENV NODE_ENV=production ASTRO_TELEMETRY_DISABLED=1 HOST=0.0.0.0 PORT=4321 DB_PATH=/data/tea-talks.sqlite
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/server.mjs /app/security-headers.mjs ./
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 4321
CMD ["node", "server.mjs"]
