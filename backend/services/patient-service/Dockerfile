FROM node:18-alpine
WORKDIR /app
COPY services/patient-service/package.json .
RUN npm install --production
COPY shared/ ./shared/
RUN ln -s /app/shared /shared
COPY services/patient-service/server.js .
ENV NODE_ENV=production
ENV PORT=5002
EXPOSE 5002
CMD ["node", "server.js"]
