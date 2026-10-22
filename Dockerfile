# ===================================================
# NewsFlow AI — Dockerfile de Producción para Coolify
# ===================================================

# Etapa 1: Build de dependencias y aplicaciones
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY packages/shared-types ./packages/shared-types
COPY packages/database ./packages/database
COPY packages/integrations ./packages/integrations
COPY apps/api ./apps/api
COPY apps/web ./apps/web
COPY workers ./workers

# Instalar todas las dependencias del monorepo
RUN npm install

# Generar Prisma Client
RUN npx prisma generate --schema=./packages/database/prisma/schema.prisma

# Compilar tipos compartidos, integraciones y base de datos
RUN npm run build --workspace=@newsflow/shared-types
RUN npm run build --workspace=@newsflow/integrations
RUN npm run build --workspace=@newsflow/database

# Compilar frontend Web y backend API
RUN npm run build --workspace=@newsflow/web
RUN npm run build --workspace=@newsflow/api
RUN (npm run build --workspace=@newsflow/workers || (cd workers && npx tsc))

# Etapa 2: Imagen Final Liviana de Ejecución
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache curl openssl

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app ./

EXPOSE 3000

# Script de inicio: ejecuta migraciones y levanta la aplicación unificada
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./packages/database/prisma/schema.prisma || true && node apps/api/dist/main.js"]
