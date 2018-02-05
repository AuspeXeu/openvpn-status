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

# Installation
### 1. Get the source

``git clone https://github.com/AuspeXeu/openvpn-status.git``

### 2. Install dependencies

```
cd openvpn-status
npm install
sudo npm install pm2 -g
```

### 3. Configuration

The configuration is handled in the ``config.json`` file.

| Option  | Default       | Description  |
| ------- |:-------------:| ------------ |
| port    | ``3013``      | Port on which the server will be listening. |
| bind    | ``127.0.0.1`` | Address to which the server will bind to. Change to ``0.0.0.0`` to make available on all interfaces. |
| servers | ``[]``        | Array of servers. _Example:_ ``[{"name": "Server"}]`` |

Example:
```
{
  "port": 3013,
  "bind": "127.0.0.1",
  "servers": [
    {"name": "Server A"},
    {"name": "Server B"}
  ]
}
```

### 4. OpenVPN configuration

Copy the `status.sh` file to the folder containing your OpenVPN configuration (e.g. `server.conf`). Then add the following lines to your configuration file. This will intall the `client-connect` and `client-disconnect` hooks to provide the data to the web interface.

```
script-security 2
client-connect ./status.sh
client-disconnect ./status.sh
```

### 5. Build

Before the application is ready to run, the frontend needs to be built. This is done using npm.

``npm run build``

# Run

```
pm2 start pm2.json
pm2 save
```

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

# Special Thanks To

### Maxmind

[Maxmind](http://dev.maxmind.com/geoip/geoip2/geolite2/) provides all of the IP information used in this project to determine where the VPN connection is connecting from.

### GoSquared

[GoSquared](https://www.gosquared.com) provides the flag icons for this project. The source for the flag icons can be found [here](https://www.gosquared.com/resources/flag-icons/).

# Screenshots

### Status panel
![Status panel](https://raw.githubusercontent.com/AuspeXeu/openvpn-status/master/screen1.png)

### Event panel
![Event panel](https://raw.githubusercontent.com/AuspeXeu/openvpn-status/master/screen2.png)
