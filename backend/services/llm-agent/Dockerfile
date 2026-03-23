FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY server.js .
ENV PORT=5013
EXPOSE 5013
CMD ["node", "server.js"]
