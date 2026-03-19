FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY rules/ ./rules/
COPY analyzer.js .
COPY server.js .
ENV PORT=5009
EXPOSE 5009
CMD ["node", "server.js"]
