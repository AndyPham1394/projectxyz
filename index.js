const express = require("express");
const helmet = require("helmet");
const path = require("path");
const fs = require("fs");
const process = require("process");
const env = require("dotenv").config();
const App = express();
const router = require("./routers/project.router.js");
const PORT = process.env.PORT;
App.use(helmet({ contentSecurityPolicy: false }));

// template engine init
App.engine("temp", function (filePath, options, callback) {
  fs.readFile(filePath, function (err, content) {
    if (err) return callback(err);
    var rendered = content.toString();
    for (data in options) {
      if (data !== "settings" && data !== "_locals" && data !== "cache") {
        rendered = rendered.replaceAll("#" + data + "#", options[data]);
      }
    }
    return callback(null, rendered);
  });
});
App.use(express.static("statics"));
App.use(express.json({ limit: "100kb" }));
App.set("views", "./views");
App.set("view engine", "temp"); // xác định template engine logic được dùng, function App.engine có thể được dùng nhiều lần để init nhiều template engine
// nên phải xác định là ta dùng engine nào để render
App.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

App.use("/api", router);

App.use((req, res) => {
  res.end();
});
setTimeout(() => {
  App.listen(PORT, () => {
    console.log("HTTP server start on port : ", PORT);
  });
}, 3000);
