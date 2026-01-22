# Build stage
FROM node:24-alpine AS builder
WORKDIR /app
COPY modules/vitals/package*.json ./
COPY modules/vitals/tsconfig*.json ./
COPY modules/vitals/angular.json ./
COPY modules/vitals/src ./src
RUN npm install --no-audit --no-fund
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=builder /app/dist/vitals/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 4202
CMD ["nginx", "-g", "daemon off;"]
