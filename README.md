# openvpn-status [![Version npm](https://img.shields.io/npm/v/openvpn-status.svg?style=flat-square)](https://www.npmjs.com/package/openvpn-status)[![Dependencies](https://img.shields.io/david/auspexeu/openvpn-status.svg?style=flat-square)](https://david-dm.org/auspexeu/openvpn-status)

A web-based application to monitor multiple [OpenVPN](https://openvpn.net/index.php/open-source/overview.html) servers.

Features
* WebSocket based real-time event log
* Persistent event log
* Full material design
* Multi server support

## Pre-requisites

- [x] [NodeJS](https://nodejs.org/en/download/package-manager/) 6 or higher
- [x] npm package manager

## Installation
1. Get the source

``git clone https://github.com/AuspeXeu/openvpn-status.git``

2. Install dependencies _(the last step might need ``sudo``)_

```
cd openvpn-status
npm install
npm install pm2 -g
```

## Configuration

The configuration is handled in the ``config.json`` file.

| Option  | Default       | Description  |
| ------- |:-------------:| ------------ |
| port    | ``3013``      | Port on which the server will be listening. |
| bind    | ``127.0.0.1`` | Address to which the server will bind to. Change to ``0.0.0.0`` to make available on all addresses. |
| servers | ``[]``        | Array of servers. The location of this file is specified with the ``status`` option in your server [configuration](https://openvpn.net/index.php/open-source/documentation/howto.html). _Example:_ ``[{"name": "Server", "logFile": "/etc/openvpn/openvpn-status.log"}]`` |

Example:
```
{
  "port": 3013,
  "bind": "127.0.0.1",
  "servers": [
    {"name": "Server A", "logFile": "/etc/openvpn/openvpn-status-A.log"},
    {"name": "Server B", "logFile": "/etc/openvpn/openvpn-status-B.log"}
  ]
}
```

_(Note: The user running the application needs to have read access to the log file.)_

## Build

Before the application is ready to run, the frontend needs to be built. This is done using npm.

``npm run build``

## Run

``pm2 start pm2.json``

This makes the application available on http://localhost:3013.

## (optional) Running the service behind nginx as a reverse proxy

In order to integrate the service into your webserver you might want to use nginx as a reverse proxy. The following configuration assumes that the port is set to *3013* as it is by default. The example also contains basic HTTP authentication to protect the service from unauthorised access.

```
server {
  listen 80;
  server_name [domain];

  location / {
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;
  }
}
```

## Special Thanks To

### Maxmind

[Maxmind](http://dev.maxmind.com/geoip/geoip2/geolite2/) provides all of the IP information used in this project to determine where the VPN connection is connecting from.

### GoSquared

[GoSquared](https://www.gosquared.com) provides the flag icons for this project. The source for the flag icons can be found [here](https://www.gosquared.com/resources/flag-icons/).

## Screenshots

### Status panel
![Status panel](https://raw.githubusercontent.com/AuspeXeu/openvpn-status/master/screen1.png)

### Event panel
![Event panel](https://raw.githubusercontent.com/AuspeXeu/openvpn-status/master/screen2.png)
