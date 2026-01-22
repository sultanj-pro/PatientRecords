# Build stage
FROM node:24-alpine AS builder
WORKDIR /app
COPY modules/visits/package*.json ./
COPY modules/visits/tsconfig*.json ./
COPY modules/visits/angular.json ./
COPY modules/visits/src ./src
RUN npm install --no-audit --no-fund
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=builder /app/dist/visits/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 4205
CMD ["nginx", "-g", "daemon off;"]
