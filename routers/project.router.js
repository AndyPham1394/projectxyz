const express = require("express");
const router = express.Router();
const machineRouter = require("./routers.machineRouter.js");
const chatRouter = require("./routers.chatRouter.js");
const validate = require("../validates/project.validate.js");

/*
 * router se nhan cac request /api va dieu phoi no cho cac controller tuong ung
 */
router.use(express.static("statics"));
// sau khi validate api thi truyen sang gameRouter
router.use("/machine", validate.machineValidate, machineRouter);
router.use("/chat", validate.chatValidate, chatRouter);

module.exports = router;
