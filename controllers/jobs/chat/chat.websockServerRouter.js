const http = require("http");
const webSockServer = require("./webSocketServer");
const controller = require("./chat.websocketServerController");
/**
 * tạo 1 server và listen bằng input Port - default 83,
 * return 1 websock instance
 */
function startServer(port = 83, cb = () => {}) {
  var server = http.createServer();
  const websock = new webSockServer({
    httpServer: server,
    keepalive: true, // enable keepalive timer
    keepaliveInterval: 10000, // mỗi 10s ping 1 lần nếu không có hoạt động trên client
    keepaliveGracePeriod: 10000, // thời gian đợi sau khi gửi ping
    dropconnectionOnKeepaliveTimeout: true, // nếu đợi quá thời gian mà không có phản hồi thì đóng kết nối
    autoAcceptConnections: false, // không tự động accept connections
    disableNagleAlgorithm: true, // disable Nagle Algorithm sẽ giảm latency
    assembleFragments: true, // 1 message gửi theo nhiều frame sẽ được lắp thành 1 rồi mới emit 'message'
    maxReceivedFrameSize: 0x10000, // max  64kB frame size
    maxReceivedMessageSize: 0x10000, // max 100kB message size
  });
  server.listen(port, cb);
  return websock;
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

const websock = startServer(process.env.WEBSOCKETPORT, () => {
  console.log("start websocket on port ", process.env.WEBSOCKETPORT);
});
// push test ip vào allowedList
websock.allowedIpTable.push("::ffff:127.0.0.1");
websock.allowedIpTable.push("::1");
websock.on("request", (request) => {
  // handle cho các request có path '/api/chat'
  websock.handleClientPath(
    "/api/chat",
    request,
    (client) => {
      client.on("message", (message) => {
        let frame = websock.parseMessage(message);
        if (frame === null) {
          client.drop();
        } else {
          if (websock.handleMessage(frame, client)) {
            controller.call(frame); // call controller để handle frame
          }
        }
      });
      client.on("close", (code, desc) => {
        websock.clientClose(client);
        process.send({ logout: client.name }); // khi có client close connection thì gửi message đến http server để cập nhật namesTable để xóa name
      });
    }
    // có thể có các midleware(request) thêm vào
  );
  //... có thể thêm các hanglePath khác vào....
  // sau các handleClient đến cuối cùng mà vẫn chưa được handle thì reject request
  websock.handleReject(request);
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// những event từ controller
/**
 * send JSON message to client
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
 * handle assign event
 */
controller.on("assignReturn", (User) => {
  sendMessage([User.name], User);
});
/**
 * handle get event
 */
controller.on("getReturn", (data) => {
  sendMessage([data.origin], data);
});
/**
 * handle message event
 */
controller.on("messageReturn", (data) => {
  if (data.type.match(/^(per)$/i)) {
    sendMessage([data.name, data.destination[0]], data);
  } else {
    sendMessage([data.name, ...data.destination.slice(1)], data);
  }
});
/**
 * handle delete event
 */
controller.on("deleteReturn", (data) => {
  sendMessage(data.members, data.frame);
});
/**
 * handle create event
 */
controller.on("createReturn", (data) => {
  if (data.type.match(/^(per)$/i)) {
    sendMessage([data.name, data.destination[0]], data);
  } else {
    sendMessage([data.name], data);
  }
});
/**
 * handle invite event
 */
controller.on("inviteReturn", (data) => {
  sendMessage(data.members, data.frame);
});
/**
 * handle escape event
 */
controller.on("escapeReturn", (data) => {
  sendMessage(data.members, data.frame);
});
/**
 * handle cho getAvatar event
 */
controller.on("getavatarReturn", (data) => {
  sendMessage([data.name], data);
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * module có chức năng entry-server để các websocket client kết nối, validate connection, quản lý các users đang online
 * nhận các message từ các users và gửi message đến các users
 */

/**
 * cho phép request có ip trùng với ip này được phép kết nối đến websockServer
 */
allowIP = (ip = "") => {
  return websock.allowIP(ip);
};
/**
 * đưa name và ip này vào list cho phép đăng nhập server
 */
loginName = (name, ip, secret) => {
  return websock.loginName(name, ip, secret);
};
process.on("message", (m) => {
  if (Object.hasOwn(m, "allowIp")) {
    allowIP(m.allowIp);
  } else if (Object.hasOwn(m, "loginName")) {
    // push name, ip, secret cua user vao namesTable list
    loginName(m.loginName[0], m.loginName[1], m.loginName[2]); // 5s sau mà không thấy name trong onlineTable tức là name đã không kết nối
    // kiểm tra xem tên có trong onlineTable không
    let timeOut = setTimeout(() => {
      if (
        websock.onlineTable.findIndex(
          (ob) => ob !== null && ob.name === m.loginName[0]
        ) !== -1
      ) {
        clearTimeout(timeOut);
      } else {
        process.send({ logout: m.loginName[0] }); // lúc này xóa tên khỏi nameTable
        websock.removeClientNameFromNamesTable(m.loginName[0]); // xóa name khỏi websock.namesTable
        clearTimeout(timeOut);
      }
    }, 5000); // sau 5s nếu client không đăng nhập vào websocket server thì xóa tên khỏi namesTable và báo cho http server
  }
});
