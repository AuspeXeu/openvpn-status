#!/bin/bash
HOST="127.0.0.1"
PORT="3013"
SERVER="0"

if [ "$script_type" == "client-connect" ]; then
  JSON="{\"pub\":\"$trusted_ip\",\"cn\":\"$common_name\",\"vpn\":\"$ifconfig_pool_remote_ip\"}"
  curl -H "Content-Type: application/json" -X POST -d "$JSON" "http://$HOST:$PORT/server/$SERVER/connect" --connect-timeout 2 -m 3
elif [ "$script_type" == "client-disconnect" ]; then
  JSON="{\"cn\":\"$common_name\"}"
  curl -H "Content-Type: application/json" -X POST -d "$JSON" "http://$HOST:$PORT/server/$SERVER/disconnect" --connect-timeout 2 -m 3
fi
exit 0
