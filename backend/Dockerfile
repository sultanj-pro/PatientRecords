FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY init-db.js .
COPY server.js .
COPY openapi.json .
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001
CMD ["npm", "start"]
