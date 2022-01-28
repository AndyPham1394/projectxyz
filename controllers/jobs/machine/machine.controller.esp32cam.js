/**
 * chuyên dùng cho esp32cam, gồm có gửi các controls đến cam để setting,
 * truy cập /client để get stream data, thiết lập websocket connection để điều khiển
 * led và xoay cam
 */
const express = require("express");
const esp = express.Router();
const path = require("path");
const http = require("http");
const { EventEmitter } = require("stream");
const Websockets = require("websocket");
var cameraip = "";
/**
 * bắt đầu mornotoring camera bằng cách pass ip vào
 * @param {*} ip
 */

/**
 * chuyển control request của client đến localmachine
 */
// static file cho /machine/esp32cam
// use body parser
esp.use(express.urlencoded({ extended: true }));
esp.use(express.static("statics"));
esp.get("/", (req, res) => {
  if (cameraip != "") {
    //res.sendFile(path.join(__dirname, "../../../views/esp32cam.html"));
    res.render("esp32cam_mainpage");
  } else {
    res.send("cameraip chua xac dinh").end();
  }
});

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

// mỗi lần có client kết nối đến /client thì server bắt đầu get stream data từ camera
// emit data này để tất cả các client sau đó có thể lấy được, nếu không còn client lấy data
// thì server ngắt kết nối stream data với camera
let x = new EventEmitter(); // tao eventEmitter 'x'
var htt;
var state = 0;
// dùng websocket để xác định client có còn kết nối hay không sẽ chính xác hơn
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
    // neu state la 1 va data la -1 thi ngat ket noi voi server
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
 * get stream data tại đây
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
 * tạo kết nối websocket với client machine khi có kết nối websocket từ client thì
 * server cũng sẽ tạo 1 kết nối websocket với machine
 */
/**
 * tạo server websocket
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
 * kết nối websocket, mỗi lần client có kết nối websocket đến server:81 thì
 * server sẽ tạo 1 kết nối websocket với localmachine:83 để chuyển tiếp message của
 * client đến localmachine
 */
const wscon = new Websockets.server({
  httpServer: server,
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

//////////////////////////////////////////////////////////
const esp32 = {};
esp32.esp32Controller = esp;
esp32.start = (ip) => {
  cameraip = ip;
};
module.exports = esp32;
