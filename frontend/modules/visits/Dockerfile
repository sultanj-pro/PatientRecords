# Build stage
FROM node:24-alpine AS builder
WORKDIR /app

# Copy shared library
COPY shared ../shared
COPY tsconfig.base.json ../tsconfig.base.json

# Copy package files and module source
COPY modules/visits/package*.json ./
COPY modules/visits/src ./src
COPY modules/visits/webpack.config.js ./
COPY modules/visits/tsconfig.json ./

# Install dependencies and build
RUN npm install --no-audit --no-fund
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=builder /app/dist/visits /usr/share/nginx/html
COPY modules/visits/src/index.html /usr/share/nginx/html/index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 4200
CMD ["nginx", "-g", "daemon off;"]
