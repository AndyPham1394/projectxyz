const express = require("express");
const fs = require("fs");
const crypto = require("crypto");
const http = require("http");
const machineController = {};
const path = require("path");
const { EventEmitter } = require("stream");
const esp32cam = require("./jobs/machine/machine.controller.esp32cam");
/**
 * router dành riêng cho machine/esp32cam, vì esp32cam có nhi?u ch?c nang nên nó s? du?c thi?t k? riêng 1 router
 */
esp32cam.start("192.168.1.2");
machineController.esp32cam = esp32cam.esp32Controller;

////////////////////////////////////////////////////////////////////////////////////////////
const machinejobspath = path.join(__dirname, "../controllers/jobs/machine");
var serverPassWord = fs
  .readFileSync(`${machinejobspath}/hashtext.txt`)
  .toString();

var localMachineList = [];
/**
 * load list of local machines from list file to applist
 */
function loadLocalMachineList(text) {
  let list = fs
    .readFileSync(`${machinejobspath}/localmachinelist.txt`)
    .toString();
  let flist = [];
  list.split("\n").forEach((item) => {
    if (item.length > 0) {
      let object = {};
      JSON.parse(item, (key, value) => {
        if (key === "name") {
          object.name = value;
        } else if (key === "ip") {
          object.ip = value;
          flist.push(object);
        }
      });
    }
  });
  return flist;
}
localMachineList = loadLocalMachineList();
function updateLocalMachineList(machinelist = []) {
  let thislist = "";
  machinelist.forEach((item) => {
    thislist = thislist + JSON.stringify(item) + "\n";
  });
  fs.writeFile(`${machinejobspath}/localmachinelist.txt`, thislist, (err) => {
    if (err) throw err;
  });
}

var onlineLocalMachineList = [];
var pingEvent = new EventEmitter();
// ping ok thì check d? push name vào list n?u chua có trong list
pingEvent.on("pingok", (name) => {
  if (onlineLocalMachineList.indexOf(name) == -1) {
    onlineLocalMachineList.push(name);
  }
});
// ping false thì lo?i b? name trong list n?u dang ? trong online list
pingEvent.on("pingfalse", (name) => {
  let position = onlineLocalMachineList.indexOf(name);
  if (position != -1) {
    onlineLocalMachineList.splice(position, 1);
  }
});
// g?i ping request d?n các client machine, n?u chúng nh?n du?c request và tr? l?i t?c là chúng có online
function pingMachine(machinelist) {
  machinelist.forEach((item) => {
    http
      .get(`http://${item.ip}/ping`, (res) => {
        //console.log("localmachine : " + item.name + " da tra loi ping");
        pingEvent.emit("pingok", item.name);
      })
      .on("error", (err) => {
        //console.log("local machine : " + item.name + " khong tra loi ping!");
        pingEvent.emit("pingfalse", item.name);
      });
  });
}

pingMachine(localMachineList);
setInterval(() => {
  pingMachine(localMachineList);
}, 10000);

machineController.getMainPage = function (req, res, next) {
  res.controllerJob = {};
  res.controllerJob.ten = "machineController";
  res.controllerJob.task = "mainpage";
  res.controllerJob.data = {
    title: "template engine c?a tôi",
    field1: onlineLocalMachineList.toString(),
    field2: "control value2",
    field3: "control value3",
  };
  //console.log("machineController.mainpage --done");
  next();
};
machineController.getPPI = function (req, res, next) {
  console.log("machineController.getPPI --done");
  process.env.machineController = true;
  next();
};

/**
 * router cho path: '/api/machine/machieesubmit', các localmachine s? báo danh ? dây d? server có th?
 * bi?t du?c ip c?a chúng, localmachine s? c?n ph?i có password d? có th? báo danh thành công, n?u password
 * dúng thì chúng s? du?c luu tên và ip vào danh sách d? theo dõi thu?ng xuyên, server s? g?i các ping d?n các
 * localmachine d? ki?m tra có dang online không, thông tin này d? ph?c v? cho trang ch? /machine, ch?a thông tin các
 * localmachine dang online
 */
machineController.postMachineSubmit = function (req, res, next) {
  let timthaypass = false;
  // loop qua cac properties trong req.body
  for (pro in req.body) {
    // neu tim thay 'password' thi lay value cua no => hash => so sanh voi serverPass
    // neu thanh cong thi luu ten cua thiet bi, khong thi thoi
    if (pro.toLowerCase() == "password") {
      timthaypass = true;
      let value = req.body[`${pro}`];
      // console.log(value);
      // xac dinh do dai passWord khong qua 20 ky tu
      if (value.length < 20) {
        // hash
        crypto.pbkdf2(value, "dung", 10000, 32, "sha256", (err, buffer) => {
          if (err) {
            console.log(err);
            res.send("khong the xu ly password").end();
            return;
          }
          // kiem tra neu mat khau dang nhap dung thi xac nhan va luu name, ip cua client vao danh sach
          // kiem tra trong danh sach xem ten thiet bi da ton tai chua, neu chua thi push them vao neu roi thi replace, vi moi thiet bi chi co
          // duy nhat 1 name khong the trung duoc, ip co the trung hoac da thay doi, moi lan may tram dangky se luu lai dia chi ip cua no
          if (buffer.toString("hex") === serverPassWord) {
            res.send("Dang nhap thanh cong!, passWord chinh xac").end();
            for (pro in req.body) {
              if (pro.toLowerCase() == "name") {
                let val = req.body[`${pro}`];
                let obj = {
                  name: val,
                  ip: req.ip,
                };
                console.log("name : ", val);
                console.log("substr : ", req.ip.substring(0, 2));
                if (req.ip.substring(0, 7) == "::ffff:") {
                  console.log(req.ip.substring(7));
                  req.ip = req.ip.substring(7);
                } else if (req.ip.substring(0, 2) == "::") {
                  console.log(req.ip.substring(2));
                  obj.ip = req.ip.substring(2);
                }
                let trung = false;
                localMachineList.forEach((ob) => {
                  if (ob.name.toString() == val) {
                    console.log("name da ton tai trong danh sach - thay the");
                    trung = true;
                    ob.ip = req.ip;
                  }
                });
                if (!trung) {
                  console.log("push them vao danh sach");
                  // push danh sach va update file localmachinelist.txt
                  localMachineList.push(obj);
                }
                updateLocalMachineList(localMachineList);
                console.log(localMachineList);
              }
            }
          } else {
            res
              .send("Dang nhap khong thanh cong!, passWord khong chinh xac")
              .end();
          }
        });
      } else {
        res.send("passWord khong hop le!").end();
      }
      break;
    }
  }
  // den day tuc la khong tim thay data
  if (timthaypass == false) res.send("data khong chinh xac!").end();
};

/**
 * return online-machine-list
 *
 */
machineController.getOnlineMachine = (req, res, next) => {
  let object = {
    soluong: onlineLocalMachineList.length,
  };
  res
    .send(
      "hien co :" +
        object.soluong +
        " machine dang online - " +
        onlineLocalMachineList.toString()
    )
    .end();
};

module.exports = machineController;
