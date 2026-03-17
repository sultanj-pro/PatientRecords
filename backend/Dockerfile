FROM node:18-alpine
WORKDIR /app
COPY backend/package.json .
RUN npm install --production
COPY backend/init-db.js .
COPY backend/server.js .
COPY backend/openapi.json .
COPY frontend/modules/registry.json .
ENV NODE_ENV=production
ENV PORT=8001
EXPOSE 8001
CMD ["npm", "start"]
