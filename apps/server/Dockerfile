FROM node:20-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy shared package
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/src/ ./packages/shared/src/
COPY packages/shared/tsconfig.json ./packages/shared/

# Copy server package
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

# Copy dictionary JSON files to dist (tsc doesn't copy non-ts files)
RUN cp -r src/data dist/data

ENV NODE_ENV=production

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --skip-generate || echo 'DB push warning, continuing'; node dist/index.js"]
