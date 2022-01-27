const express = require("express");
const machineRouter = express.Router();
const machineController = require("../controllers/controller.machineController.js");

machineRouter.use(express.static("statics"));
// '/'
machineRouter.get("/", machineController.getMainPage, (req, res) => {
  // request đến được đây tức là không render
  res.send("khong render gi ca").end();
});

// machinesubmit và onlinemachine list
machineRouter.post("/machinesubmit", machineController.postMachineSubmit);
//machineRouter.get("/onlinemachine", machineController.getOnlineMachine);

// router dành riêng cho esp32cam
machineRouter.use("/esp32cam", machineController.esp32cam);

// các request có path không đúng quy định sẽ được gửi đến đây
machineRouter.use((req, res) => {
  console.log("co nguoi truy cap path khong ton tai");
  res.sendStatus(400);
});

module.exports = machineRouter;
