FROM node:12

ENV STATUS_BIND="0.0.0.0"
ENV STATUS_PORT="3013"

WORKDIR /usr/src/app
COPY . .
RUN npm install
RUN npm run build
EXPOSE 3013
CMD ["npm","start"]
