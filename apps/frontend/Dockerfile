# Frontend de Facturo (Next.js 14). Lo construye Coolify desde docker-compose.coolify.yml.

# ---- Etapa 1: dependencias ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# El frontend SOLO instala con --legacy-peer-deps (conflictos de peer dependencies conocidos).
RUN npm ci --legacy-peer-deps

# ---- Etapa 2: build ----
FROM node:22-bookworm-slim AS build
WORKDIR /app
# Next incrusta las NEXT_PUBLIC_* en el JavaScript al compilar: tienen que llegar como ARG de build.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_CULQI_PUBLIC_KEY=""
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_CULQI_PUBLIC_KEY=$NEXT_PUBLIC_CULQI_PUBLIC_KEY \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx next build

# ---- Etapa 3: ejecución ----
FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
# `next start` necesita .next, public, la configuración y node_modules (el paquete `next` y sus dependencias).
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/next.config.mjs ./next.config.mjs
USER node
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
