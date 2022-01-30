const express = require("express");
const chatRouter = express.Router();
const fileUpload = require("express-fileupload");
const bodyParser = require("body-parser");
const chatController = require("../controllers/controller.chatController");
const path = require("path");

/////////////////////////////////////////////////////////////////////////
// use express-fileupload middleware to handle file uploads in routes
chatRouter.use(
  fileUpload({
    limits: { fileSize: 1024 * 1024 * 5 },
  })
);
chatRouter.use(express.static("statics"));
chatRouter.use(bodyParser.urlencoded({ extended: true }));
chatRouter.get("/", (req, res) => {
  res.render("chatLogIn", { MESSAGE: "" });
});
chatRouter.get("/signup", (req, res) => {
  res.render("chatSignUp", { MESSAGE: "" });
});
// create new user
chatRouter.post("/signup", chatController.handleNewUser);
// user login
chatRouter.post("/login", chatController.handleLogin);
// post media - client get media through statics folder
chatRouter.post("/postmedia", chatController.handlePostMedia);
// post avatar- client get avatar through statics folder
chatRouter.post("/postavatar", chatController.handlePostAvatar);
///////////////////////////////////////////////////////////////////////////

module.exports = chatRouter;
