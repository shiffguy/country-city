FROM node:20-alpine

WORKDIR /app

# Copy only server and shared package files
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/src/ ./packages/shared/src/
COPY packages/shared/tsconfig.json ./packages/shared/

COPY apps/server/package.json ./apps/server/
COPY apps/server/tsconfig.json ./apps/server/
COPY apps/server/prisma/ ./apps/server/prisma/
COPY apps/server/src/ ./apps/server/src/

# Install shared deps and build
WORKDIR /app/packages/shared
RUN npm install && npx tsc

# Install server deps
WORKDIR /app/apps/server
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Build server
RUN npx tsc

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
