FROM node:18-alpine
WORKDIR /app
COPY services/visits-service/package.json .
RUN npm install --production
COPY shared/ ./shared/
RUN ln -s /app/shared /shared
COPY services/visits-service/server.js .
ENV PORT=5006
EXPOSE 5006
CMD ["node", "server.js"]
