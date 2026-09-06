# Single-image deploy: builds the web app, runs migrations, then serves the
# API + static web + scheduler + Discord bot from one always-on Node process.
FROM node:22-slim

WORKDIR /app

# Prisma needs openssl at runtime.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install dependencies (workspace-aware, cache-friendly).
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
RUN npm ci

# Copy the rest and build.
COPY . .
RUN npm run prisma:generate && npm run build -w @gacha/web

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Apply migrations, then boot the server (which serves the built web app).
CMD ["sh", "-c", "npx prisma migrate deploy --schema prisma/schema.prisma && npm run start -w @gacha/server"]
