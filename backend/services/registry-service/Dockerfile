FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY server.js .
COPY registry.json .
ENV NODE_ENV=production
ENV PORT=5100
EXPOSE 5100
CMD ["node", "server.js"]
