# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
# Ensure Vite uses production mode
ENV NODE_ENV=production
RUN npm run build

# ---- Run stage (Nginx) ----
FROM nginx:1.27-alpine
# Remove default config and add our own
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
# Nginx is the default CMD