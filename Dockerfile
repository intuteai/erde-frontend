# ---- Build stage ----
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Toolchain for any native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Upgrade npm to avoid optional-deps bug with Rollup prebuilt binaries
RUN npm i -g npm@11.6.2

COPY package*.json ./
# DO NOT omit optional deps: Rollup needs its platform package (gnu/musl)
RUN npm ci --no-audit --no-fund

COPY . .
ENV NODE_ENV=production
RUN npm run build

# ---- Run stage (no nginx) ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app

# Lightweight static server
RUN npm i -g serve

# Copy built assets only
COPY --from=build /app/dist /app/dist

EXPOSE 8080
CMD ["serve", "-s", "dist", "-l", "8080"]