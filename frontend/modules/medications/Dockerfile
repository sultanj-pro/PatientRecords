# Build stage
FROM node:24-alpine AS builder
WORKDIR /app
COPY modules/medications/package*.json ./
COPY modules/medications/tsconfig*.json ./
COPY modules/medications/angular.json ./
COPY modules/medications/src ./src
RUN npm install --no-audit --no-fund
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=builder /app/dist/medications/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 4204
CMD ["nginx", "-g", "daemon off;"]
