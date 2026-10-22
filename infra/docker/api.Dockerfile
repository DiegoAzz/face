FROM node:20-alpine AS builder

WORKDIR /app

# Instalar herramientas para dependencias nativas (ej. bcrypt, prisma)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY packages/shared-types ./packages/shared-types
COPY packages/database ./packages/database
COPY packages/integrations ./packages/integrations
COPY apps/api ./apps/api

RUN npm install

# Generar cliente Prisma y compilar paquetes
RUN npx prisma generate --schema=./packages/database/prisma/schema.prisma
RUN npm run build --workspace=@newsflow/shared-types
RUN npm run build --workspace=@newsflow/integrations
RUN npm run build --workspace=@newsflow/database
RUN npm run build --workspace=@newsflow/api

# Etapa 2: Runner
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app ./

EXPOSE 3000

# Script de arranque: corre migraciones y levanta el servidor
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./packages/database/prisma/schema.prisma && node apps/api/dist/main.js"]
