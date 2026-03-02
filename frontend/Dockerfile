# Build stage
FROM node:24-alpine AS builder
WORKDIR /app

# Copy root-level config
COPY tsconfig.base.json ./

# Copy shell-app specific files
COPY shell-app/package*.json ./shell-app/
COPY shell-app/tsconfig*.json ./shell-app/
COPY shell-app/angular.json ./shell-app/
COPY shell-app/webpack.config.js ./shell-app/
COPY shell-app/src ./shell-app/src

# Install dependencies and build
WORKDIR /app/shell-app
RUN npm install --no-audit --no-fund
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=builder /app/shell-app/dist/shell-app /usr/share/nginx/html
COPY modules/registry.json /usr/share/nginx/html/modules/registry.json
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 4200
CMD ["nginx", "-g", "daemon off;"]
