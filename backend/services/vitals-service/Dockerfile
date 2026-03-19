FROM node:18-alpine
WORKDIR /app
COPY services/vitals-service/package.json .
RUN npm install --production
COPY shared/ ./shared/
COPY services/vitals-service/server.js .
ENV PORT=5003
EXPOSE 5003
CMD ["node", "server.js"]
