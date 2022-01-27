# projectxyz

for env

- add .env to indicate HTTP and websoket ports
  PORT=<main_http_server_port>
  WEBSOCKETPORT=<chat_websocketserver_port>
  MACHINEWEBSOCKETPORT=<machine_websocket_port>
- add mongourl
  MONGOURL=<your_mongodb_url>
- we must wait for mongodb connected before start listen to clients on http and websocket

for chat's websocket

- chat's websocket server is ran on child process forked by main process
- if main process unexpectedly exit, chat's websocket server may not be exit, we have to do it manually
