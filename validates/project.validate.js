const express = require("express");
/*
 * Validate se check cac thanh phan co ban cua 1 request cho tung controller
 * vi du kiem tra do dai request body, check cac header va cac thanh phan co ban
 * co hop le khong, neu co thi cho qua, khong co thi khong cho qua, viec security se
 * dien ra o phan nay
 */
const validates = {};

validates.gameValidate = function gameValidate(req, res, next) {
  console.log("gameValidate --done - ", req.ip);
  res.validate = true;
  next();
};

validates.machineValidate = function machineValidate(req, res, next) {
  //console.log("machineValidate --done");
  res.validate = true;
  next();
};
validates.chatValidate = function chatValidate(req, res, next) {
  res.validate = true;
  next();
};

module.exports = validates;
