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

# Non-root user — this stage only serves static files, no reason to run as root.
RUN groupadd -r nodegrp && useradd -r -g nodegrp nodeusr

# Lightweight static server
RUN npm i -g serve

# Copy built assets only
COPY --from=build /app/dist /app/dist
RUN chown -R nodeusr:nodegrp /app/dist

EXPOSE 8080
USER nodeusr

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/', r => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["serve", "-s", "dist", "-l", "8080"]