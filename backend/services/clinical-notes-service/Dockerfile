FROM node:18-alpine
WORKDIR /app
COPY services/clinical-notes-service/package.json .
RUN npm install --production
COPY shared/ ./shared/
RUN ln -s /app/shared /shared
COPY services/clinical-notes-service/server.js .
ENV PORT=5012
EXPOSE 5012
CMD ["node", "server.js"]
