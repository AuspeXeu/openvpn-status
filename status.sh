#!/bin/bash
HOST="127.0.0.1"
PORT="3013"
SERVER="0"
USERNAME="admin"
PASSWORD="admin"

JSON="{\"script\":\"$script_type\",\"pub\":\"$trusted_ip\",\"cn\":\"$common_name\",\"user\":\"$username\",\"vpn\":\"$ifconfig_pool_remote_ip\"}"
curl -u $USERNAME:$PASSWORD -H "Content-Type: application/json" -X POST -d "$JSON" "http://$HOST:$PORT/server/$SERVER/script" --connect-timeout 2 -m 3
exit 0
