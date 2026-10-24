# UNTESTED EXAMPLE — never built or run in the development environment. Adjust as needed.
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

FROM base AS run
ENV NODE_ENV=production
COPY --from=build /app /app
RUN mkdir -p /data/storage && chown -R node:node /data /app/.next
ENV STORAGE_DIR=/data/storage
USER node
EXPOSE 3000
# Web app by default; the worker service in docker-compose.yml overrides this with "npm run worker"
CMD ["npm", "run", "start"]
