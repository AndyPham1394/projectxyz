/**
 * this module is used to handle websocket connection, receive and send message to client
 * monitor client connection and disconnection, client name and ip
 * receive user login data from controller.chatcontroller and inform controller.chatcontroller when user disconnected
 * parse message from client and pass to websocketServerController
 * receive result from websocketServerController and execute handler functions
 */
const http = require("http");
const webSockServer = require("./webSocketServer");
const controller = require("./chat.websocketServerController");
/**
 * create and return 1 websock instance
 */
function startServer(port = 83, cb = () => {}) {
  var server = http.createServer();
  const websock = new webSockServer({
    httpServer: server,
    keepalive: true,
    keepaliveInterval: 10000,
    keepaliveGracePeriod: 10000,
    dropconnectionOnKeepaliveTimeout: true,
    autoAcceptConnections: false,
    disableNagleAlgorithm: true,
    assembleFragments: true,
    maxReceivedFrameSize: 0x10000,
    maxReceivedMessageSize: 0x10000,
  });
  server.listen(port, cb);
  return websock;
}

const websock = startServer(process.env.WEBSOCKETPORT, () => {
  console.log("start websocket on port ", process.env.WEBSOCKETPORT);
});
// test ip
websock.allowedIpTable.push("::ffff:127.0.0.1");
websock.allowedIpTable.push("::1");
websock.on("request", (request) => {
  // handle for '/api/chat'
  websock.handleClientPath("/api/chat", request, (client) => {
    client.on("message", (message) => {
      let frame = websock.parseMessage(message);
      if (frame === null) {
        client.drop();
      } else {
        if (websock.handleMessage(frame, client)) {
          controller.call(frame); // call controller to pass frame data
        }
      }
    });
    client.on("close", (code, desc) => {
      websock.clientClose(client);
      process.send({ logout: client.name }); // inform controller.chatcontroller when user disconnected
    });
  });
  // add other path here if needed
  // request not handled will be reject
  websock.handleReject(request);
});

/**
 * send JSON message to client by client names
 */
function sendMessage(toWho = [], message) {
  let mes = JSON.stringify(message);
  if (!Array.isArray(toWho)) {
    return;
  }
  websock.onlineTable.forEach((user) => {
    if (user) {
      if (toWho.includes(user.name)) {
        user.sendUTF(mes);
      }
    }
  });
}
/**
 * handles for data return from websocketModel
 * after we execute controller.call(frame) model will return result by emit event by name whenever model done its job
 */
controller.on("assignReturn", (User) => {
  sendMessage([User.name], User);
});

controller.on("getReturn", (data) => {
  sendMessage([data.origin], data);
});

controller.on("messageReturn", (data) => {
  if (data.type.match(/^(per)$/i)) {
    sendMessage([data.name, data.destination[0]], data);
  } else {
    sendMessage([data.name, ...data.destination.slice(1)], data);
  }
});

controller.on("deleteReturn", (data) => {
  sendMessage(data.members, data.frame);
});

controller.on("createReturn", (data) => {
  if (data.type.match(/^(per)$/i)) {
    sendMessage([data.name, data.destination[0]], data);
  } else {
    sendMessage([data.name], data);
  }
});

controller.on("inviteReturn", (data) => {
  sendMessage(data.members, data.frame);
});

controller.on("escapeReturn", (data) => {
  sendMessage(data.members, data.frame);
});

controller.on("getavatarReturn", (data) => {
  sendMessage([data.name], data);
});

/**
 * push ip to allowedIpTable in websocketServer
 */
allowIP = (ip = "") => {
  return websock.allowIP(ip);
};
/**
 * push name to namesTable in websocketServer
 */
loginName = (name, ip, secret) => {
  return websock.loginName(name, ip, secret);
};
// messages from main process (controller.chatcontroller)
process.on("message", (m) => {
  if (Object.hasOwn(m, "allowIp")) {
    allowIP(m.allowIp);
  } else if (Object.hasOwn(m, "loginName")) {
    loginName(m.loginName[0], m.loginName[1], m.loginName[2]);
    // 5s after push name to namesTable, we check if user online by check onlineTable
    // if they are not online, delete them from namesTable, and inform controller.chatcontroller that user disconnected
    // so later they can login again, this action make sure if user sent login request to http server but not connected to websocket server
    // that means they failed to login
    let timeOut = setTimeout(() => {
      if (
        websock.onlineTable.findIndex(
          (ob) => ob !== null && ob.name === m.loginName[0]
        ) !== -1
      ) {
        clearTimeout(timeOut);
      } else {
        // if user is not online
        process.send({ logout: m.loginName[0] });
        websock.removeClientNameFromNamesTable(m.loginName[0]);
        clearTimeout(timeOut);
      }
    }, 5000);
  }
});
