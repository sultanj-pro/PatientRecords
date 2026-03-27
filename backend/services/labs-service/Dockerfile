FROM node:18-alpine
WORKDIR /app
COPY services/labs-service/package.json .
RUN npm install --production
COPY shared/ ./shared/
RUN ln -s /app/shared /shared
COPY services/labs-service/server.js .
ENV PORT=5004
EXPOSE 5004
CMD ["node", "server.js"]
