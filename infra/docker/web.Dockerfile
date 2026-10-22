# Etapa 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar paquetes base y lockfiles
COPY package*.json ./
COPY packages/shared-types ./packages/shared-types
COPY apps/web ./apps/web

# Instalar dependencias del monorepo
RUN npm install

# Compilar tipos compartidos y el frontend
RUN npm run build --workspace=@newsflow/shared-types
RUN npm run build --workspace=@newsflow/web

# Etapa 2: Servidor Web Nginx
FROM nginx:alpine

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY infra/docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
