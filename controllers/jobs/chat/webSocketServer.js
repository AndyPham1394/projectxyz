const websocket = require("websocket");
/////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * newebsock class thêm một số method : handleClient, handleReject
 */
class newwebsock extends websocket.server {
  constructor(serverConfig) {
    super(serverConfig);
    // các tables
    /**
     * chứa các ip được phép truy cập vào websockServer
     */
    this.allowedIpTable = new Array();

    /**
     * sau khi đăng nhập thành công vào /login thì userName và ip của user đó được lưu vào bảng này
     * để sau đó user có thể assign tên với server (server thấy tên và ip có trong bảng này thì mới cho assign)
     * 1 client bắt buộc phải assign tên server trước khi có thể send bất cứ frame nào khác đến server
     */
    this.namesTable = new Array();

    /**
     * chứa các object đại diện cho các client đã assigned tên thành công với server, các object
     * này dùng để in/out đến các client
     */
    this.onlineTable = new Array();
  }

  /**
   * validate request trước khi accept, ip của request phải có trong allowedIpTable mới được chấp nhận
   */
  validateRequest(request = new websocket.request()) {
    if (this.allowedIpTable.indexOf(request.remoteAddress) === -1) {
      request.validateSuccess = false;
    } else {
      request.validateSuccess = true;
    }
  }

  /**
   * parse message frame => return message object,
   * nếu frame không phải json thì return null
   */
  parseMessage(message) {
    try {
      return JSON.parse(message.utf8Data);
    } catch (e) {
      return null;
    }
  }

  /**
   * cho phép request có ip trùng với ip này được phép kết nối đến websockServer
   */
  allowIP(ip = "") {
    if (ip !== null && ip !== "") {
      if (this.allowedIpTable.indexOf(ip) == -1) {
        return this.allowedIpTable.push(ip);
      }
    } else {
      return -1;
    }
  }

  /**
   * đưa name và ip và name vào list cho phép đăng nhập server
   */
  loginName(name, ip, secret) {
    let ob = {
      name: name,
      ip: ip,
      secret: secret,
    };
    if (this.namesTable.findIndex((name) => name.name == ob.name) === -1) {
      this.namesTable.push(ob);
      return true;
    }
    return false;
  }

  /**
   * khi client close connection thì namesTable và onlineTable nếu có chứa tên và object của client này
   * sẽ được xóa
   */
  removeClientNameFromNamesTable(name) {
    const pos = this.namesTable.findIndex((ten) => ten.name === name);
    if (pos !== -1) {
      this.namesTable.splice(pos, 1);
    }
  }

  /**
   * thêm client vào onlineTable
   */
  addClientToOnlineTable(client) {
    let indexOfNull = this.onlineTable.indexOf(null); // tìm vị trí null trong onlineTable
    if (indexOfNull == -1) {
      return this.onlineTable.push(client) - 1;
    }
    this.onlineTable[indexOfNull] = client;
    return indexOfNull;
  }

  /**
   * xóa client khỏi onlineTable dùng position
   */
  removeClientFromOnlineTable(pos) {
    if (pos !== -1) {
      this.onlineTable[pos] = null;
      return pos;
    }
    return -1;
  }

  clientClose(client) {
    if (client.name) {
      this.removeClientNameFromNamesTable(client.name);
      if (client.clientsTablePos !== -1) {
        this.removeClientFromOnlineTable(client.clientsTablePos);
      }
    }
  }

  /**
   * check frame được client gửi đến để xem có hợp lệ không,
   * handle việc client assign name với server
   * call controller khi đã xử lý xong message
   */
  handleMessage(frame, client = new websocket.connection()) {
    if (Object.hasOwn(frame, "control")) {
      switch (frame.control) {
        case "assign": // assign them phan secret
          if (
            (!Object.hasOwn(frame, "name") || typeof frame.name !== "string") &&
            (!Object.hasOwn(frame, "secret") ||
              typeof frame.secret !== "string")
          ) {
            // quá trình này check luôn xem name có secret đúng k(secret trong namesTable)
            client.drop();
            return false;
          } else {
            if (frame.name.length > 20 || frame.secret.length > 20) {
              client.drop();
              break;
            }
            let positionInNamesTable = this.namesTable.findIndex(
              (name) =>
                name.name === frame.name &&
                this.allowedIpTable.includes(name.ip) === true
            );
            if (positionInNamesTable !== -1) {
              if (!client.assigned) {
                if (
                  this.namesTable[positionInNamesTable].secret === frame.secret
                ) {
                  client.clientsTablePos = this.addClientToOnlineTable(client);
                  client.assigned = true;
                  client.name = frame.name;
                  return true;
                } else {
                  client.drop();
                  return false;
                }
              }
            } else {
              client.drop();
              return false;
            }
          }
        default:
          // client có control command không phải assign mà không có tên là không hợp lệ
          // và frame nào không phải control:assign mà có name cũng không hợp lệ
          if (!client.name || Object.hasOwn(frame, "name")) {
            client.drop();
            return false;
          } else {
            frame.name = client.name;
            return true;
          }
      }
    } else {
      client.drop();
      return false;
    }
  }

  /**
  handle những request có path trùng với input path
  */
  handleClientPath(
    inputPath = "",
    request = new websocket.request(),
    cb = (client = new websocket.connection()) => {},
    ...midleware
  ) {
    this.validateRequest(request);
    for (let i = 0; i < midleware.length; i++) {
      midleware[i](request);
    }
    // nếu trước đó request chưa được handle thì thử handle request
    // bằng cách so sánh input path với path của request(request.resource)
    if (request.handled !== true && request.validateSuccess == true) {
      if (request.resource.startsWith(inputPath)) {
        cb(request.accept());
        request.handled = true;
        return;
      }
    }
  }

  /**
   * từ chối request nếu nó chưa được handle hoặc request đã bị từ chối đăng nhập bởi validater
   */
  handleReject(request = new websocket.request()) {
    if (request.handled !== true || request.validateSuccess === false) {
      request.reject(404);
    }
  }

  // end class definition
}
module.exports = newwebsock;
