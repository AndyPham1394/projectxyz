const websocket = require("websocket");
/**
 * additional functions and tables for websocket server
 * used to monitor client connections, handle request by path
 * validate client ip and name
 */
class newwebsock extends websocket.server {
  constructor(serverConfig) {
    super(serverConfig);
    // tables
    /**
     * contain ips allowed to connect to websockServer
     */
    this.allowedIpTable = new Array();

    /**
     * contain names and secret of clients, used to handle assign command, if client name is not in this table
     * then they are not allowed to assign
     */
    this.namesTable = new Array();

    /**
     * contain objects of clients, when they connected in to websockServer, the object represent them
     * will be add to this table, search in this table to find which client we want by their name included in those objects
     * and then send message to them
     */
    this.onlineTable = new Array();
  }

  /**
   * search allowedIpTable for ip of client, if ip of request found in allowedIpTable then request is valid
   */
  validateRequest(request = new websocket.request()) {
    if (this.allowedIpTable.indexOf(request.remoteAddress) === -1) {
      request.validateSuccess = false;
    } else {
      request.validateSuccess = true;
    }
  }

  /**
   * parse message frame => return message object
   */
  parseMessage(message) {
    try {
      return JSON.parse(message.utf8Data);
    } catch (e) {
      return null;
    }
  }

  /**
   * add ip to allowedIpTable
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
   * push name, ip and secret to namesTable
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

  removeClientNameFromNamesTable(name) {
    const pos = this.namesTable.findIndex((ten) => ten.name === name);
    if (pos !== -1) {
      this.namesTable.splice(pos, 1);
    }
  }

  addClientToOnlineTable(client) {
    let indexOfNull = this.onlineTable.indexOf(null); // find index of null in onlineTable and put client in that position
    if (indexOfNull == -1) {
      return this.onlineTable.push(client) - 1; // if not then push client to the end of onlineTable
    }
    this.onlineTable[indexOfNull] = client;
    return indexOfNull;
  }

  /**
   * delete client from onlineTable
   */
  removeClientFromOnlineTable(pos) {
    if (pos !== -1) {
      this.onlineTable[pos] = null;
      return pos;
    }
    return -1;
  }
  /**
   * handle when client close connection
   */
  clientClose(client) {
    if (client.name) {
      this.removeClientNameFromNamesTable(client.name);
      if (client.clientsTablePos !== -1) {
        this.removeClientFromOnlineTable(client.clientsTablePos);
      }
    }
  }

  /**
   * handle request by their path, middleware also available
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
    // append handled property to request
    if (request.handled !== true && request.validateSuccess == true) {
      if (request.resource.startsWith(inputPath)) {
        cb(request.accept());
        request.handled = true;
        return;
      }
    }
  }

  /**
   * handle when client send message
   */
  handleMessage(frame, client = new websocket.connection()) {
    if (Object.hasOwn(frame, "control")) {
      switch (frame.control) {
        case "assign": // handle for assign command, the first command that client send
          if (
            (!Object.hasOwn(frame, "name") || typeof frame.name !== "string") &&
            (!Object.hasOwn(frame, "secret") ||
              typeof frame.secret !== "string")
          ) {
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
                this.allowedIpTable.includes(name.ip) === true &&
                name.secret === frame.secret
            ); // check if name and secret is in namesTable
            if (positionInNamesTable !== -1) {
              if (!client.assigned) {
                client.assigned = true; // set assigned to true
                client.name = frame.name; // append name to client object
                client.clientsTablePos = this.addClientToOnlineTable(client); // then add client object to onlineTable
                return true;
              }
            } else {
              client.drop();
              return false;
            }
          }
        default:
          // any other command that client send contain name is not allowed, or client object don't have name property also not allowed
          if (!client.name || Object.hasOwn(frame, "name")) {
            client.drop();
            return false;
          } else {
            // if client object have name property and frame not contain name property it's ok
            frame.name = client.name; // append name to frame
            return true;
          }
      }
    } else {
      client.drop();
      return false;
    }
  }

  /**
   * every request that client send to websockServer will be handle by this function
   * reject request if they not yet handled
   */
  handleReject(request = new websocket.request()) {
    if (request.handled !== true || request.validateSuccess === false) {
      request.reject(404);
    }
  }

  // end class definition
}
module.exports = newwebsock;
