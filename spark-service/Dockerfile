FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY . .
ENV PORT=8998
EXPOSE 8998
CMD ["node", "server.js"]
