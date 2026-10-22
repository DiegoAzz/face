# ===================================================
# NewsFlow AI — Dockerfile de Producción para Coolify
# ===================================================

FROM node:20-alpine

WORKDIR /app

# Instalar dependencias nativas y OpenSSL ANTES de generar Prisma
RUN apk add --no-cache curl openssl python3 make g++ libc6-compat

# Copiar configuración del monorepo y código fuente
COPY package*.json ./
COPY packages ./packages
COPY apps ./apps
COPY workers ./workers

# Instalar todas las dependencias
RUN npm install

# Generar Prisma Client con OpenSSL correctamente detectado
RUN npx prisma generate --schema=./packages/database/prisma/schema.prisma

# Compilar tipos compartidos, integraciones y base de datos
RUN npm run build --workspace=@newsflow/shared-types
RUN npm run build --workspace=@newsflow/integrations
RUN npm run build --workspace=@newsflow/database

# Crear y estructurar la base de datos embebida local
ENV DATABASE_URL="file:/app/data/newsflow.db"
RUN mkdir -p /app/data
RUN npx prisma db push --schema=./packages/database/prisma/schema.prisma

# Compilar frontend Web y backend API
RUN npm run build --workspace=@newsflow/web
RUN npm run build --workspace=@newsflow/api
RUN (npm run build --workspace=@newsflow/workers || (cd workers && npx tsc))

ENV NODE_ENV=production
ENV PORT=3000

RUN mkdir -p /app/data

EXPOSE 3000
EXPOSE 80

CMD ["node", "apps/api/dist/main.js"]
