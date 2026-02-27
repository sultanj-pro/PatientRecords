FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY registry.json /usr/share/nginx/html/registry.json

EXPOSE 5000

CMD ["nginx", "-g", "daemon off;"]
