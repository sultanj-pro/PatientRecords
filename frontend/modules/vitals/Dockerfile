# Build stage
FROM node:24-alpine AS builder
WORKDIR /app

# Copy shared library
COPY shared ../shared
COPY tsconfig.base.json ../tsconfig.base.json

# Copy package files and module source
COPY modules/vitals/package*.json ./
COPY modules/vitals/src ./src
COPY modules/vitals/webpack.config.js ./
COPY modules/vitals/tsconfig.json ./

# Install dependencies and build
RUN npm install --no-audit --no-fund
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=builder /app/dist/vitals /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 4200
CMD ["nginx", "-g", "daemon off;"]
