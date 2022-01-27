const fs = require("fs");
const express = require("express");
var web = fs.readFileSync("./views/testweb.html").toString();
// nhap file goc
const view = {};

// render se thay the nhung const o file goc bang cac gia tri duoc pass tu view engine init
view.render = function (req, res, next) {
  // parse va render thanh cong thi khong next(), khong thanh cong thi next()
  let temp = web;
  try {
    for (data in res.job.data) {
      temp = temp.replaceAll("#" + data + "#", res.view.data[data]); // #key# duoc thay the bang data[key]
    }
    res.send(temp).end();
  } catch (e) {
    console.log(e);
    next();
  }
};

module.exports = view;
