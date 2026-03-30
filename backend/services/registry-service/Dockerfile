FROM node:18-alpine
WORKDIR /app
COPY services/registry-service/package.json .
RUN npm install --production
COPY shared/ ./shared/
RUN ln -s /app/shared /shared
COPY services/registry-service/server.js .
COPY services/registry-service/registry.json .
ENV NODE_ENV=production
ENV PORT=5100
EXPOSE 5100
CMD ["node", "server.js"]
