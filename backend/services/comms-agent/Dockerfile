FROM node:18-alpine

WORKDIR /app

COPY package.json .
RUN npm install --production

COPY . .

EXPOSE 5011

HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=15s \
  CMD wget -qO- http://localhost:5011/health || exit 1

CMD ["node", "server.js"]
