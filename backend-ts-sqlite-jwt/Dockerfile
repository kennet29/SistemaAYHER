FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY tsconfig.json .
COPY prisma ./prisma
COPY tsconfig.seed.json .
COPY tsconfig.seed.json .
COPY src ./src

RUN npm install
ENV DATABASE_URL=file:./dev.db
RUN npm run prisma:generate
RUN npm run seed
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/tsconfig.seed.json ./tsconfig.seed.json
COPY package*.json ./
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=4000
ENV DATABASE_URL=file:/app/data/ayher.db

EXPOSE 4000

ENTRYPOINT ["./docker-entrypoint.sh"]
