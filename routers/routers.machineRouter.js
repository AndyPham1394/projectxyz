const express = require("express");
const machineRouter = express.Router();
const machineController = require("../controllers/controller.machineController.js");

machineRouter.use(express.static("statics"));
machineRouter.get("/", machineController.getMainPage);
// localmachine use this router to ping server
machineRouter.post("/machinesubmit", machineController.postMachineSubmit);
// return esp8266 data
machineRouter.get("/getesp8266data", machineController.getEsp8266);
// router for esp32cam
machineRouter.use("/esp32cam", machineController.esp32cam);

// unhandle request
machineRouter.use((req, res) => {
  res.sendStatus(400);
});

module.exports = machineRouter;
