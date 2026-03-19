FROM node:18-alpine
WORKDIR /app
COPY services/care-team-service/package.json .
RUN npm install --production
COPY shared/ ./shared/
COPY services/care-team-service/server.js .
ENV PORT=5007
EXPOSE 5007
CMD ["node", "server.js"]
