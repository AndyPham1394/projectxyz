const Model = require("./jobs/chat/chat.websocketServerModel");
const crypto = require("crypto");
const fs = require("fs");
const controller = {};
const { MongoClient } = require("mongodb");
var client = new MongoClient(process.env.MONGOURL);
client.connect(async (ret) => {
  console.log("chat controller mongodb connected!");
});
const UserDataBase = client.db("info").collection("Users");
async function getUserPassWord(userName) {
  let user = await UserDataBase.findOne({ name: userName });
  if (user) {
    return user.password;
  }
  return null;
}
async function addUser(info) {
  let user = await UserDataBase.findOne({ name: info.name }).catch(
    (err) => null
  );
  if (!user) {
    let add = await UserDataBase.insertOne(info).catch((err) => null);
    if (add.insertedId) return true;
    else {
      return false;
    }
  }
  return false;
}
// khởi động websocket server ở child process
const cp = require("child_process");
var websockServer = cp.fork(
  `${__dirname}/jobs/chat/chat.websockServerRouter.js`
);
// nhận online list từ websockserver
var onlineTable = [];
// có message logout từ websock server thì remove name khỏi online table
websockServer.on("message", (mess) => {
  if (Object.hasOwn(mess, "logout")) {
    let index = onlineTable.indexOf(mess.logout);
    if (index >= 0) {
      let p = onlineTable.splice(index, 1);
    }
  }
});
websockServer.on("exit", (exitcode) => {
  console.log(`websocket server exited with code ${exitcode}`);
  websockServer = cp.fork(`${__dirname}/jobs/chat/chat.websockServerRouter.js`);
});
websockServer.on("spawn", (exitcode) => {
  console.log("spawned child running process for chat websocket server");
});
websockServer.on("err", (exitcode) => {
  console.log("chat websocket server error");
  console.log(err);
});
/**
 * load chat Mainpage
 */
controller.getMainPage = (req, res, next) => {
  next();
};
/**
 * handle login post request, validate password
 * return trang đăng nhập thành công cho client
 * nếu thành công thì return data trong user_table của user đó (chứa thông tin user, tên các session mà user đã tham gia)
 */
controller.handleLogin = async (req, res, next) => {
  if (Object.hasOwn(req.body, "user") && Object.hasOwn(req.body, "password")) {
    if (
      req.body.user.length >= 4 &&
      req.body.user.length <= 20 &&
      req.body.password.length >= 4 &&
      req.body.password.length <= 20
    ) {
      if (onlineTable.includes(req.body.user)) {
        // nếu đã online rồi thì không cho đăng nhập nữa
        res.render("chatLogIn", {
          MESSAGE: "Đăng nhập thất bại, xin hãy thử lại bằng tài khoản khác.",
        });
      } else {
        let x = await getUserPassWord(req.body.user);
        if (x) {
          crypto.pbkdf2(
            req.body.password,
            "mackhenhatdoi",
            1024,
            32,
            "sha256",
            (err, result) => {
              if (err) {
                console.log(err);
                return;
              }
              let encPassword = result.toString("hex");
              if (encPassword === x) {
                var secret = Math.random().toString(16).slice(2);
                res.render("chat", {
                  USERNAME: req.body.user,
                  SECRET: secret,
                });
                websockServer.send({ allowIp: req.ip });
                websockServer.send({
                  loginName: [req.body.user, req.ip, secret],
                });
                onlineTable.push(req.body.user);
              } else {
                res.render("chatLogIn", {
                  MESSAGE: "Đăng nhập không thành công! Xin hãy thử lại.",
                }); // length của username và mật khẩu không đạt yêu cầu
              }
            }
          );
        } else {
          res.render("chatLogIn", {
            MESSAGE: "User name không tồn tại! Xin hãy thử lại.",
          }); // user không tồn tại
        }
      }
    } else {
      res.render("chatLogIn", {
        MESSAGE: "Đăng nhập không thành công! Xin hãy thử lại.",
      }); // length của username và mật khẩu không đạt yêu cầu
    }
  } else {
    res.render("chatLogIn", {
      MESSAGE: "Hãy điền đầy đủ User name và Password!",
    }); // request phải có username và password
  }
};
/**
 * handle post media, nhận các media file mà user post lên, chứa chúng vào bộ nhớ
 */
controller.handlePostMedia = (req, res, next) => {
  if (!req.files || !Object.hasOwn(req.files.file, "name")) {
    // res.status(400).send("no file uploaded!").end();
  } else {
    // nhận được file thì lưu lại và đánh dấu file đó from who to who để lưu
    fs.open(
      `./statics/uploadFile/from${req.body.from}to${req.body.to}-${req.files.file.name}`,
      "w+",
      (err, fd) => {
        if (!err) {
          fs.write(fd, req.files.file.data, (err, writen, buffer) => {});
          fs.close(fd);
          res.send(`${req.files.file.name}`).end();
        }
      }
    );
  }
};
/**
 * handle post avatar, chứa chúng vào bộ nhớ
 */
controller.handlePostAvatar = (req, res, next) => {
  if (!req.files || !Object.hasOwn(req.files.file, "name")) {
    // res.status(400).send("no file uploaded!").end();
  } else {
    // nhận được file thì lưu lại và đánh dấu file đó from who to who để lưu
    fs.open(
      `./statics/uploadAvatar/avatar${req.body.from}${req.files.file.name}`,
      "w+",
      (err, fd) => {
        if (!err) {
          fs.write(fd, req.files.file.data, (err, writen, buffer) => {});
          fs.close(fd);
          res.send(`avatar${req.body.from}${req.files.file.name}`).end();
        }
      }
    );
  }
};
/**
 * handle các request get media từ server
 */
controller.handleGetMedia = (req, res, next) => {};
/**
 * handle post newuser request, nhận yêu cầu tạo user mới của client, nếu tạo thành công thì lưu new user vào user_table
 * và thông báo thành công cho khách, return trang đăng nhập thành công cho client
 */
controller.handleNewUser = async (req, res, next) => {
  if (Object.hasOwn(req.body, "user") && Object.hasOwn(req.body, "password")) {
    if (
      req.body.user.length >= 4 &&
      req.body.user.length <= 20 &&
      req.body.password.length >= 4 &&
      req.body.password.length <= 20 &&
      req.body.user.match(/^[A-Za-z0-9]+$/i) &&
      req.body.password.match(/^[A-Za-z0-9]+$/i)
    ) {
      let x = await getUserPassWord(req.body.user); // check xem username da ton tai chua
      if (!x) {
        crypto.pbkdf2(
          req.body.password,
          "mackhenhatdoi",
          1024,
          32,
          "sha256",
          async (err, result) => {
            if (err) {
              console.log(err);
              return;
            }
            if (
              await addUser({
                name: req.body.user,
                password: result.toString("hex"),
              })
            ) {
              // them username va password vao csdl
              await Model.createNewUser(req.body.user);
              var secret = Math.random().toString(16).slice(2);
              res.render("chat", {
                USERNAME: req.body.user,
                SECRET: secret,
              });
              websockServer.send({ allowIp: req.ip });
              websockServer.send({
                loginName: [req.body.user, req.ip, secret],
              });
            } else {
              res.render("chatSignUp", {
                MESSAGE: "Không thể tạo tài khoản mới! xin hãy thử lại.",
              }); // truong hop khong the tao new user
            }
          }
        );
      } else {
        res.render("chatSignUp", {
          MESSAGE: "Tên tài khoản này đã tồn tại! xin hãy thử lại.",
        }); // truong hop userName da ton tai
      }
    } else {
      res.render("chatSignUp", {
        MESSAGE: "Tên tài khoản hoặc mật khẩu không hợp lệ! xin hãy thử lại.",
      }); // neu do dai username va mat khau hoac pattern cua chung khong hop le
    }
  } else {
    res.render("chatSignUp", {
      MESSAGE: "Xin hãy điền đầy đử Tên tài khoản và Password.",
    }); // phai co username va password
  }
};
module.exports = controller;
