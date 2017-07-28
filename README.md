# openvpn-status [![Version npm](https://img.shields.io/npm/v/openvpn-status.svg?style=flat-square)](https://www.npmjs.com/package/openvpn-status)[![Dependencies](https://img.shields.io/david/auspexeu/openvpn-status.svg?style=flat-square)](https://david-dm.org/auspexeu/openvpn-status)

A web-based application to monitor clients connected to an openvpn server.

Features
* WebSocket based real-time event log
* Persistent event log
* Full material design
* Multi server support

## Installation
You can either clone the code directly from the repository

``git clone https://github.com/AuspeXeu/openvpn-status.git``

or download it as a zip archive from

[https://github.com/AuspeXeu/openvpn-status/archive/master.zip](https://github.com/AuspeXeu/openvpn-status/archive/master.zip)

Afterwards the dependencies have to be installed inside the installation directiory.

```
cd openvpn-status
npm install
```

## Configuration

The ``port`` and ``bind`` address under which the webinterface is available can be specified inside the ``config.json``, further the location of the openvpn log file can be declared. The example below shows an exemplary configuration. Multiple servers can be handled as well as a single server.

```
{
  "port": 3013,
  "bind": "127.0.0.1",
  "servers": [{"name": "Server A", "logFile": "/etc/openvpn/openvpn-status-A.log"},{"name": "Server B", "logFile": "/etc/openvpn/openvpn-status-B.log"}]
}
```

_(Note: The user running the server needs to have read access to the log file.)_

## Build

Before the application is ready to run, the frontend needs to be build. This is done using npm.

``npm run build``

## Run

In order to run the server you can either run it in foreground

``node server``

or run it like a deamon using ``pm2`` to do so we first need to install pm2 using either locally or globally whichever you prefer. For a local installation simply omit the -g flag.

``npm install pm2 -g``

In case you are on a Linux machine you most likely have to run.

``sudo npm install pm2 -g``

After that you can execute the bash script ``pm2 start pm2.json`` inside the installation directory.

## Running the service behind nginx as a reverse proxy (optional)

In order to integrate the service into your webserver you might want to use nginx as a reverse proxy. The following configuration assumes that the port is set to *3013* as it is by default. The example also contains basic HTTP authentication to protect the service from unauthorised access.

```
server {
  listen 80;
  server_name [domain];

  auth_basic "Restricted";
  auth_basic_user_file /etc/nginx/cred/.status;

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
