const express = require("express");
const viewEngine = {};
// include view template cho can thiet o day
//var machineView = require("./views.machineView");
/*
 * template engine se check object duoc pass tu controller de biet duoc
 * phai chon file template nao, dung data duoc pass nhu nao
 * tuy thuoc vao nhung gi ma template nay ghi nhan duoc, no se quyet
 * dinh su dung template nao de render
 */

// check ten de biet ta can dung view cua machine hay game
function initController(req, res, next) {
  res.view = {
    ten: "",
    engine: "",
    template: "",
    data: {},
  };
  switch (res.controllerJob.ten) {
    case "machineController":
      res.view.engine = "temp";
      res.view.ten = res.controllerJob.ten;
      break;
    case "gameController":
      break;
    default:
      return -1;
  }
  return 1;
}
// check task de biet duoc nen dung file template nao
function initTask(req, res, next) {
  switch (res.controllerJob.task) {
    case "mainpage":
      res.view.template = "machinemainpage";
      break;
    case "notmainpage":
      break;
    default:
      return -1;
  }
  return 1;
}
// check data truoc khi gan no vao view
function initData(req, res, next) {
  res.view.data = res.controllerJob.data;
  return 1;
}

/**  process dùng để parse các data mà controller đưa vào, để xác định views data cần dùng
 * sau đó sẽ render những data đã parse được, nếu thành công thì return và không next(), việc
 * sử lý request sẽ dừng ở đây, nếu không thành công thì sẽ next() để tiếp tục xử lý request ở bước sau
 **/
viewEngine.process = function (req, res, next) {
  if (
    initController(req, res, next) !== -1 &&
    initTask(req, res, next) !== -1 &&
    initData(req, res, next) !== -1
  ) {
    //render view

    if (res.controllerJob.ten == "machineController") {
      res.render(res.view.template, res.view.data);
      return 1;
    }
  }
  next();
};

module.exports = viewEngine;
