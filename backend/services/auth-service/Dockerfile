FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY server.js .
ENV NODE_ENV=production
ENV PORT=5001
EXPOSE 5001
CMD ["node", "server.js"]
