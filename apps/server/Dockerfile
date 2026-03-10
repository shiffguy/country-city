FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace files
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/

# Install dependencies
RUN npm install --workspace=@country-city/shared --workspace=@country-city/server

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY apps/server/ ./apps/server/

# Build shared package
RUN npm run build --workspace=@country-city/shared

# Generate Prisma client
RUN cd apps/server && npx prisma generate

# Build server
RUN npm run build --workspace=@country-city/server

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/package.json
COPY --from=builder /app/apps/server/prisma ./apps/server/prisma
COPY --from=builder /app/apps/server/src/data ./apps/server/src/data
COPY --from=builder /app/apps/server/node_modules/.prisma ./apps/server/node_modules/.prisma
COPY --from=builder /app/package.json ./package.json

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

WORKDIR /app/apps/server

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
