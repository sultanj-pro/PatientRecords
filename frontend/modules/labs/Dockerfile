# Build stage
FROM node:24-alpine AS builder
WORKDIR /app
COPY modules/labs/package*.json ./
COPY modules/labs/tsconfig*.json ./
COPY modules/labs/angular.json ./
COPY modules/labs/src ./src
RUN npm install --no-audit --no-fund
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=builder /app/dist/labs/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 4203
CMD ["nginx", "-g", "daemon off;"]
