/**
 * get data from esp32cam and broadcast to all client by emit an event "stream-data"
 * those client access path "/machine/client" will receive the data we broadcasted
 * monitor numbers of client accessing "/machine/client", if no client accessing, we don't broadcast data and stop get data from esp32cam
 * this server act like websocket transporter between client and esp32cam, client send command to esp32cam through this server
 * create a websocket connection to esp32cam to control rotation & on/off camera's led
 * create a websocket server listen for client to send command through this server to esp32cam
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
// command setting from client to esp32cam through server ( disabled due to camera unstable when changing camera's setting )
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

// when client-counter > 0 , start get data from esp32cam and broadcast by emit event "stream-data"
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
 * Access /client to get stream data from esp32cam by catching 'stream-data' event
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
 * websocket transport message between client and esp32cam
 */
// server
const server = http.createServer();
// bind this server to websocket server
const wscon = new Websockets.server({
  httpServer: server,
});
var wsevent = new EventEmitter();
// server on request from client
wscon.on("request", (request) => {
  var client = request.accept(); // accept connection
  x.emit("client-counter", 1); // increase client counter
  client.on("message", (data) => {
    wsevent.emit("message", data.utf8Data); // emit message when client send message to server
  });
  client.on("close", () => {
    x.emit("client-counter", -1); // decrease client counter when client disconnect
  });
});
var wscon2;
wsevent.on("message", (data) => {
  // catch 'message' event
  if (!wscon2) {
    // if there is no ws connection to esp32cam then create one and send message to esp32cam
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
    // send message if there is ws connection to esp32cam
    wscon2.sendUTF(data);
  }
});
// server listen on port ...
server.listen(process.env.MACHINEWEBSOCKETPORT, () => {
  console.log(
    "machine's websocket started on port",
    process.env.MACHINEWEBSOCKETPORT
  );
});
//////////////////////////////////////////////////////////
const esp32 = {};
esp32.esp32Controller = esp;
esp32.start = (ip) => {
  cameraip = ip;
};
module.exports = esp32;
