FROM node:10
ARG AUTH_USERNAME=admin AUTH_PASSWORD=admin VPN_NAME=Server VPN_HOST=openvpn VPN_MAN_PORT=7656
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
RUN npm run build
COPY . .
EXPOSE 3013
CMD ["npm","start"]
