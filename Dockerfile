FROM node:10
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
RUN npm build
COPY . .
EXPOSE 3013
CMD ["npm","start"]
