FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY . .
ENV PORT=5005
EXPOSE 5005
CMD ["node", "server.js"]
