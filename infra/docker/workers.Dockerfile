FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY packages/shared-types ./packages/shared-types
COPY packages/database ./packages/database
COPY packages/integrations ./packages/integrations
COPY workers ./workers

RUN npm install

RUN npx prisma generate --schema=./packages/database/prisma/schema.prisma
RUN npm run build --workspace=@newsflow/shared-types
RUN npm run build --workspace=@newsflow/integrations
RUN npm run build --workspace=@newsflow/database
RUN (npm run build --workspace=@newsflow/workers || (cd workers && npx tsc))

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app ./

CMD ["node", "workers/dist/ingestion/index.js"]
