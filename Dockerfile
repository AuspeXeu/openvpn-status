FROM node:10

ARG AUTH_USERNAME=admin
ARG AUTH_PASSWORD=admin
ARG VPN_NAME=Server
ARG VPN_HOST=openvpn
ARG VPN_MAN_PORT=7656

WORKDIR /usr/src/app
COPY . .
RUN npm install
RUN npm run build
EXPOSE 3013
CMD ["npm","start"]
