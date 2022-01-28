const express = require("express");
/*
 * add validate property to res object if request pass validation
 */
const validates = {};

validates.machineValidate = function machineValidate(req, res, next) {
  res.validate = true;
  next();
};
validates.chatValidate = function chatValidate(req, res, next) {
  res.validate = true;
  next();
};

module.exports = validates;
