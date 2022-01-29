/**
 * get stream data from esp32cam by http get and send to multi client by eventEmitter
 * create a websocket connection to esp32cam to control rotation
 * create a websocket for client to send command through this server to esp32cam
 * this server act like transporter between client and esp32cam, client send command to esp32cam through this server
 */
const express = require("express");
const esp = express.Router();
const path = require("path");
const http = require("http");
const { EventEmitter } = require("stream");
const Websockets = require("websocket");
var cameraip = "";
esp.use(express.urlencoded({ extended: true }));
esp.use(express.static("statics"));
esp.get("/", (req, res) => {
  if (cameraip != "") {
    res.render("esp32cam_mainpage");
  } else {
    res.send("cameraip not available").end();
  }
});
// command setting from client to esp32cam through server ( disabled )
esp.get("/control", (req, res) => {
  if (cameraip != "") {
    let url =
      "http://" +
      cameraip +
      ":80/control?var=" +
      req.query["var"] +
      "&val=" +
      req.query["val"];
    res.send("ok").end();
    http
      .get(url)
      .on("error", (err) => {})
      .end();
  } else {
    next();
  }
});

// maintain a client list, when a client connect to websocket, add 1 to state
// -1 when client disconnect
// server only get data from esp32cam, when state > 0, that data will be emit by 'stream-data' event
// every client connect to this server can catch this event to get stream data
let x = new EventEmitter(); // tao eventEmitter 'x'
var htt;
var state = 0;
// client events
x.on("client-counter", (data) => {
  if (state == 0 && data == 1) {
    state += data;
    const options = {
      hostname: cameraip,
      port: 81,
      path: "/stream",
      method: "GET",
    };

    htt = http.request(options, (res) => {
      res.on("data", (d) => {
        x.emit("stream-data", d);
      });
    });

    htt.on("error", (error) => {
      console.error(error);
    });

    htt.end();
    // disconnect esp32cam when there is no client connect to this server
  } else if (state == 1 && data == -1) {
    state += data;
    if (htt) htt.destroy();
    if (wscon2) wscon2.drop();
    wscon2 = null;
  } else {
    state += data;
    if (state < 0) state = 0;
  }
});
/**
 * client access /client to get stream data from esp32cam
 * this camera module output data in multipart/x-mixed-replace format
 */
esp.get("/client", (req, res) => {
  res.statusCode = 200;
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader(
    "content-type",
    "multipart/x-mixed-replace;boundary=123456789000000000000987654321"
  );
  res.setHeader("transfer-encoding", "chunked");
  res.flushHeaders();
  let qs = (buffer) => {
    res.write(buffer);
  };
  x.on("stream-data", qs);
  res.on("close", () => {
    x.removeListener("stream-data", qs);
  });
});

// manualy set camera ip
esp.post("/addCameraIp", (req, res) => {
  if (
    Object.hasOwn(req.body, "ip") &&
    req.body.ip != "" &&
    Object.hasOwn(req.body, "secret") &&
    req.body.secret != ""
  ) {
    if (req.body.secret === "littlesecret") {
      cameraip = req.body.ip;
      res.send("ok").end();
    } else {
      res.send("false").end();
    }
  } else {
    res.send("false").end();
  }
});

/**
 * create websocket connection to esp32cam to control rotation
 */
const server = http.createServer((req, res) => {
  res.setHeader("content-type", "text/plain");
  res.write("xin chao ban");
  res.end();
});
server.listen(process.env.MACHINEWEBSOCKETPORT, () => {
  console.log(
    "machine's websocket started on port",
    process.env.MACHINEWEBSOCKETPORT
  );
});
/**
 * websocket transport between client and esp32cam
 */
const wscon = new Websockets.server({
  httpServer: server,
});
wscon.on("request", (request) => {
  var client = request.accept();
  x.emit("client-counter", 1);
  client.on("message", (data) => {
    wsevent.emit("message", data.utf8Data);
  });
  client.on("close", () => {
    x.emit("client-counter", -1);
  });
});

var wscon2;
var wsevent = new EventEmitter();
wsevent.on("message", (data) => {
  if (!wscon2) {
    let wscon3 = new Websockets.client();
    wscon3.on("connect", (connection) => {
      if (connection.connected) {
        wscon2 = connection;
        wscon2.sendUTF(data);
      } else if (!connection.connected) {
        wscon2 = null;
      }
    });
    wscon3.onerror = (error) => {
      wscon3.close();
    };
    wscon3.connect(`ws://${cameraip}:83`, "arduino");
  } else {
    wscon2.sendUTF(data);
  }
});

//////////////////////////////////////////////////////////
const esp32 = {};
esp32.esp32Controller = esp;
esp32.start = (ip) => {
  cameraip = ip;
};
module.exports = esp32;
