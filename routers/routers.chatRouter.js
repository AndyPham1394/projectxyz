const express = require("express");
const chatRouter = express.Router();
const fileUpload = require("express-fileupload");
const bodyParser = require("body-parser");
const chatController = require("../controllers/controller.chatController");
const path = require("path");
// websocket được load sẽ tạo server cho các websocket connection và message handle
// tất cả việc trao đổi thông tin trong chat engine sẽ chủ yếu thông qua websocket

/**
 * thiết lập các controller cho việc load Mainpage, login, tạo new user, và tải media lên server
 */
/////////////////////////////////////////////////////////////////////////
chatRouter.use(
  fileUpload({
    limits: { fileSize: 1024 * 1024 * 5 },
  })
);
chatRouter.use(express.static("statics"));
chatRouter.use(bodyParser.urlencoded({ extended: true }));
chatRouter.get("/", chatController.getMainPage, (req, res) => {
  res.render("chatLogIn", { MESSAGE: "" });
});
chatRouter.get("/signup", chatController.getMainPage, (req, res) => {
  res.render("chatSignUp", { MESSAGE: "" });
});

// đăng nhập
chatRouter.post("/login", chatController.handleLogin);
// post media
chatRouter.post("/postmedia", chatController.handlePostMedia);
chatRouter.post("/postavatar", chatController.handlePostAvatar);
// get media
chatRouter.get("/getmedia", chatController.handleGetMedia, (req, res) => {});
// create new user
chatRouter.post("/signup", chatController.handleNewUser);
///////////////////////////////////////////////////////////////////////////

module.exports = chatRouter;
