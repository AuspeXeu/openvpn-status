echo @off

set "HOST=127.0.0.1"  :: if bind is 0.0.0.0, leave this field as 127.0.0.1
set "PORT=3013"
set "SERVER=0"
set "USERNAME=admin"
set "PASSWORD=admin"

set "JSON={\"script\":\"%script_type%\",\"pub\":\"%trusted_ip%\",\"cn\":\"%common_name%\",\"user\":\"%username%\",\"vpn\":\"%ifconfig_pool_remote_ip%\"}"
curl.exe -u %USERNAME%:%PASSWORD% -H "Content-Type: application/json" -X POST -d "%JSON%" "http://%HOST%:%PORT%/server/%SERVER%/script" --connect-timeout 2 -m 3
exit 0
