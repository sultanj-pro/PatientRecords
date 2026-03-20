FROM node:18-alpine

WORKDIR /app

COPY package.json .
RUN npm install --production

COPY . .

EXPOSE 5010

HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=10s \
  CMD wget -qO- http://localhost:5010/health || exit 1

CMD ["node", "server.js"]
