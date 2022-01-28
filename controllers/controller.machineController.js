const express = require("express");
const fs = require("fs");
const crypto = require("crypto");
const http = require("http");
const machineController = {};
const path = require("path");
const { EventEmitter } = require("stream");
const esp32cam = require("./jobs/machine/machine.controller.esp32cam");
const { MongoClient } = require("mongodb");
var client = new MongoClient(process.env.MONGOURL);
client.connect(async (ret) => {
  console.log("machines's mongodb connected!");
});
const esp8266Mongo = client.db("machine").collection("esp8266");
/**
 * esp32cam page's router and controller
 */
machineController.esp32cam = esp32cam.esp32Controller;

////////////////////////////////////////////////////////////////////////////////////////////
const machinejobspath = path.join(__dirname, "../controllers/jobs/machine");
var serverPassWord = fs
  .readFileSync(`${machinejobspath}/hashtext.txt`)
  .toString();

var localMachineList = [];
/**
 * return local-machine-list
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
var esp32camIp = localMachineList.find((item) => item.name === "esp32cam").ip;
if (esp32camIp) {
  esp32cam.start(esp32camIp);
}
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
pingEvent.on("pingok", (item) => {
  if (onlineLocalMachineList.indexOf(item) == -1) {
    onlineLocalMachineList.push(item);
  }
});
// ping false thì lo?i b? name trong list n?u dang ? trong online list
pingEvent.on("pingfalse", (item) => {
  let position = onlineLocalMachineList.indexOf(item);
  if (position != -1) {
    onlineLocalMachineList.splice(position, 1);
  }
});
// g?i ping request d?n các client machine, n?u chúng nh?n du?c request và tr? l?i t?c là chúng có online
function pingMachine(machinelist) {
  machinelist.forEach((item) => {
    http
      .get(`http://${item.ip}/ping`, (res) => {
        pingEvent.emit("pingok", item);
      })
      .on("error", (err) => {
        pingEvent.emit("pingfalse", item);
      })
      .end();
  });
}
/**
 * get data from esp8266 and push into database in 5min loop
 */
function getLocalData() {
  let esp8266 = onlineLocalMachineList.find((item) => item.name === "esp8266");
  if (esp8266) {
    http
      .get(`http://${esp8266.ip}`, (res) => {
        res.on("data", async (chunk) => {
          var data = {};
          try {
            data = JSON.parse(chunk);
            let date = new Date();
            // each document in database store data from esp8266 in one day (24h)
            // document have specific name as :"date-mouth-year"
            let timeInString =
              date.getDate() +
              "-" +
              (date.getMonth() + 1) +
              "-" +
              date.getFullYear();
            data.time = date;
            let getdata = await esp8266Mongo
              .findOne({ name: timeInString })
              .catch((err) => null); // check if document exist
            if (getdata) {
              await esp8266Mongo
                .updateOne({ name: timeInString }, { $push: { data: data } })
                .catch((err) => null);
            } else {
              // create new document if not exist
              await esp8266Mongo
                .insertOne({
                  name: timeInString,
                  data: [data],
                })
                .catch((err) => null);
            }
          } catch (err) {
            console.log(err);
          }
        });
        res.on("error", (err) => {
          console.log(err);
        });
      })
      .on("error", (err) => {
        console.log("error : " + err);
      });
  }
}
setInterval(() => {
  getLocalData();
}, 5 * 60000); // 5min

pingMachine(localMachineList);
setInterval(() => {
  pingMachine(localMachineList);
}, 10000); // ping machine

machineController.getMainPage = function (req, res, next) {
  res.render("machinemainpage", {
    title: "Machine MainPage",
    field1: onlineLocalMachineList.length,
    field2: onlineLocalMachineList[0].name,
    field3: onlineLocalMachineList[1].name,
  });
};
machineController.getPPI = function (req, res, next) {
  console.log("machineController.getPPI --done");
  process.env.machineController = true;
  next();
};
/**
 * return esp8266 raw data in database
 */
machineController.getEsp8266 = async function (req, res, next) {
  let date = new Date();
  let data = await esp8266Mongo
    .findOne({
      name: `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`,
    })
    .catch((err) => null);
  if (data) {
    delete data._id;
    res.set("Content-Type", "application/json");
    res.send(JSON.stringify(data)).end();
  } else {
    res.send(JSON.stringify({})).end();
  }
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
                  ip: req.ip.replaceAll(/.*:/g, ""),
                };
                let trung = false;
                localMachineList.forEach((ob) => {
                  if (ob.name.toString() == val) {
                    trung = true;
                    ob.ip = obj.ip;
                  }
                });
                if (!trung) {
                  // push danh sach va update file localmachinelist.txt
                  localMachineList.push(obj);
                }
                updateLocalMachineList(localMachineList);
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
