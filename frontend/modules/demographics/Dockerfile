# Build stage
FROM node:24-alpine AS builder
WORKDIR /app
COPY modules/demographics/package*.json ./
COPY modules/demographics/tsconfig*.json ./
COPY modules/demographics/angular.json ./
COPY modules/demographics/src ./src
RUN npm install --no-audit --no-fund
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=builder /app/dist/demographics/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 4201
CMD ["nginx", "-g", "daemon off;"]
