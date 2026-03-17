# Build stage
FROM node:24-alpine AS builder
WORKDIR /app

# Copy shared library and install its dependencies
COPY shared ../shared
RUN cd ../shared && npm install --no-audit --no-fund

# Copy workspace config
COPY tsconfig.base.json ../tsconfig.base.json

# Copy package files and module source
COPY modules/medications/package*.json ./
COPY modules/medications/src ./src
COPY modules/medications/angular.json ./
COPY modules/medications/webpack.config.js ./
COPY modules/medications/tsconfig*.json ./

# Install dependencies and build
RUN npm install --no-audit --no-fund
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY ../nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 4200
CMD ["nginx", "-g", "daemon off;"]
