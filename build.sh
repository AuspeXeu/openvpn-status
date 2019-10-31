#!/bin/bash
docker build -f Dockerfile.vpn -t auspexeu/openvpn-server .
docker build -f Dockerfile.monitor -t auspexeu/openvpn-status .
