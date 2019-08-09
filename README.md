# OpenVPN Status [![Dependencies](https://img.shields.io/david/auspexeu/openvpn-status.svg?style=flat-square)](https://david-dm.org/auspexeu/openvpn-status) [![Greenkeeper badge](https://badges.greenkeeper.io/AuspeXeu/openvpn-status.svg)](https://greenkeeper.io/)

A web-based application to monitor (multiple) [OpenVPN](https://openvpn.net/index.php/open-source/overview.html) servers.

Features
* Multi server support
* WebSocket based real-time events
* Map view
* Disconnect clients remotely
* Persistent event log
* Mobile friendly
* Full material design

### Client panel
![Client panel](https://raw.githubusercontent.com/AuspeXeu/openvpn-status/master/clients.png)

### Map view
![Map view](https://raw.githubusercontent.com/AuspeXeu/openvpn-status/master/map.png)

### Event panel
![Event panel](https://raw.githubusercontent.com/AuspeXeu/openvpn-status/master/events.png)

## Pre-requisites

- [x] [NodeJS](https://nodejs.org/en/download/) 10 or higher
- [x] npm package manager
- Windows 7 is only supported on version `4.2.12` and below

# Installation
Installation comes in two flavours. Either from source as per the following section or you can skip to the [docker section](https://github.com/AuspeXeu/openvpn-status#docker).
### 1. Get the source

``git clone https://github.com/AuspeXeu/openvpn-status.git``

### 2. Install dependencies

```
cd openvpn-status
npm install
sudo npm install pm2 -g
```

### 3. Configuration

The configuration is located in ``cfg.json``.

| Option   | Default       | Description  |
| -------- |:-------------:| ------------ |
| port     | `3013` | Port on which the server will be listening. |
| bind     | `127.0.0.1` | Address to which the server will bind to. Change to `0.0.0.0` to make available on all interfaces. |
| servers  | `[{"name": "Server","host": "127.0.0.1","man_port": 7656, "man_pwd": "1337"}]` | Array of servers. `man_pwd` is only needed if a password is set as per the [documentation](https://openvpn.net/community-resources/reference-manual-for-openvpn-2-0/) |
| username | `admin` | User for basic HTTP authentication. Change to `''` or `false` to disable. |
| password | `admin` | Password for basic HTTP authentication. |
| web.dateFormat | `HH:mm:ss - DD.MM.YY` | DateTime format used in the web frontend ([options](http://momentjs.com/docs/#/displaying/format/)).|

Example:
```
{
  "port": 3013,
  "bind": "127.0.0.1",
  "servers": [
    {"id": 0, "name": "Server A", "host": "127.0.0.1","man_port": 7656},
    {"id": 1, "name": "Server B", "host": "127.0.0.1","man_port": 6756}
  ],
  "username": "admin",
  "password": "YV3qSTxD",
  "web": {
    "dateFormat": "HH:mm - DD.MM.YY"
  }
}
```

### 4. OpenVPN configuration

Add the following line to your configuration file, e.g., `server.conf`. This will start the management console on port `7656` and make it accessible on `127.0.0.1`, i.e. this machine. Optionally, a password file can be specified as per the openvpn [manual](https://openvpn.net/community-resources/reference-manual-for-openvpn-2-0/).

```
management 127.0.0.1 7656 // As specified in cfg.json for this server
```

Restart your OpenVPN server.

### 5. Build

Before the application is ready to run, the frontend needs to be built. This is done using npm.

``npm run build``

# Run
This makes the application available on http://127.0.0.1:3013.

### Manually
```
node server.js
```

### As PM2 service
```
pm2 start pm2.json
pm2 save
```

### As Systemd service

```
[Unit]
Description=OpenVPN Status
After=network.target

[Service]
User=root
WorkingDirectory=/home/pi/backend \\ Adjust this
ExecStart=/usr/local/bin/node server.js
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target

```

## (optional) Running the service behind nginx as a reverse proxy

In order to integrate the service into your webserver you might want to use nginx as a reverse proxy. The following configuration assumes that the port is set to `3013` as it is by default.

```
server {
  listen 80;
  server_name [domain];

  location / {
    proxy_pass http://127.0.0.1:3013
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;
  }
}
```

# Docker
### Ports

- **3013**

### Docker-compose.yml

```yml
# Full example:
# https://raw.githubusercontent.com/AuspeXeu/openvpn-status/master/docker-compose.sample.yml

openvpn-status:
  image: auspexeu/openvpn-status
  container_name: openvpn-status
  ports:
    - 8080:3013
  volumes:
    - './status-cfg/cfg.json:/usr/src/app/cfg.json'
  restart: "unless-stopped"
```

## Browser support
Find a list of supported browsers [here](https://vuetifyjs.com/en/getting-started/quick-start#supported-browsers)

## Acknowledgements

### Maxmind

[Maxmind](http://dev.maxmind.com/geoip/geoip2/geolite2/) provides all of the IP information used in this project to determine where the VPN clients are connecting from.

### GoSquared

[GoSquared](https://www.gosquared.com) provides the flag icons for this project. The source for the flag icons can be found [here](https://www.gosquared.com/resources/flag-icons/).
