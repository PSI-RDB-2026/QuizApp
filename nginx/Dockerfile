FROM nginx:alpine
COPY nginx/reverse-proxy.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
