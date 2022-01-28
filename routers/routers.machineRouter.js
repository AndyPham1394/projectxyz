const express = require("express");
const machineRouter = express.Router();
const machineController = require("../controllers/controller.machineController.js");

machineRouter.use(express.static("statics"));
// '/'
machineRouter.get("/", machineController.getMainPage);
// machinesubmit và onlinemachine list
machineRouter.post("/machinesubmit", machineController.postMachineSubmit);
//machineRouter.get("/onlinemachine", machineController.getOnlineMachine);
machineRouter.get("/getesp8266data", machineController.getEsp8266);
// router dành riêng cho esp32cam
machineRouter.use("/esp32cam", machineController.esp32cam);

// các request có path không đúng quy định sẽ được gửi đến đây
machineRouter.use((req, res) => {
  res.sendStatus(400);
});

module.exports = machineRouter;
