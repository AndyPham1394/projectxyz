const express = require("express");
const router = express.Router();
const machineRouter = require("./routers.machineRouter.js");
const chatRouter = require("./routers.chatRouter.js");
const validate = require("../validates/project.validate.js");

/*
 * modify validates/project.validate.js to add your own validates
 */
router.use(express.static("statics"));
router.use("/machine", validate.machineValidate, machineRouter);
router.use("/chat", validate.chatValidate, chatRouter);

module.exports = router;
