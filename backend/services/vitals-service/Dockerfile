FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY . .
ENV PORT=5003
EXPOSE 5003
CMD ["node", "server.js"]
