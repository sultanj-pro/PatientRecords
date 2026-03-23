# Build stage
FROM node:24-alpine AS builder
WORKDIR /app

# Copy shared library
COPY shared ../shared
RUN cd ../shared && npm install --no-audit --no-fund

# Copy workspace config
COPY tsconfig.base.json ../tsconfig.base.json

# Copy package files and module source
COPY modules/ai-insights/package*.json ./
COPY modules/ai-insights/src ./src
COPY modules/ai-insights/angular.json ./
COPY modules/ai-insights/webpack.config.js ./
COPY modules/ai-insights/tsconfig*.json ./

# Install dependencies and build
RUN npm install --no-audit --no-fund
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY ../nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 4200
CMD ["nginx", "-g", "daemon off;"]
