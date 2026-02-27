# Build stage
FROM node:24-alpine AS builder
WORKDIR /app

# Copy shared library and install its dependencies
COPY shared ../shared
RUN cd ../shared && npm install --no-audit --no-fund

# Copy workspace config
COPY tsconfig.base.json ../tsconfig.base.json

# Copy package files and shell app source
COPY shell-app/package*.json ./
COPY shell-app/src ./src
COPY shell-app/angular.json ./
COPY shell-app/tsconfig*.json ./
COPY shell-app/webpack.config.js ./
COPY shell-app/federation.config.js ./

# Install dependencies and build
RUN npm install --no-audit --no-fund
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/shell-app /usr/share/nginx/html
COPY modules/registry.json /usr/share/nginx/html/modules/

EXPOSE 4200
CMD ["nginx", "-g", "daemon off;"]
