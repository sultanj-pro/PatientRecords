FROM node:18-alpine
WORKDIR /app
COPY services/medications-service/package.json .
RUN npm install --production
COPY shared/ ./shared/
COPY services/medications-service/server.js .
ENV PORT=5005
EXPOSE 5005
CMD ["node", "server.js"]
