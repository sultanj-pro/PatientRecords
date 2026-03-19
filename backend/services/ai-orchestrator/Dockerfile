FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY contextBuilder.js .
COPY approvalStore.js .
COPY server.js .
ENV PORT=5008
EXPOSE 5008
CMD ["node", "server.js"]
