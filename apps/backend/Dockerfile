# Backend de Facturo (Express 5 + Prisma 5.22, CommonJS). Lo construye Coolify desde docker-compose.coolify.yml.
FROM node:22-bookworm-slim

# openssl: Prisma lo necesita para su motor de consultas. ca-certificates: Prisma descarga sus binarios por HTTPS.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

# Dependencias primero (capa en caché). Se instala TODO, también `prisma` (devDependency), porque:
#  1) `postinstall` corre `prisma generate`, que necesita la CLI; con `--omit=dev` fallaría.
#  2) el arranque en producción usa `prisma db push` y `prisma db execute`, que también son la CLI.
# Por eso el esquema se copia antes de `npm ci`: el postinstall lo lee.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --include=dev

COPY . .
RUN npx prisma generate

# Carpetas de datos (volumen nombrado en /data). Se crean aquí con dueño `node` para que el volumen nuevo las herede.
RUN mkdir -p /data/uploads /data/sunat \
 && chown -R node:node /data /app

USER node
EXPOSE 4001

CMD ["sh", "scripts/arranque-produccion.sh"]
