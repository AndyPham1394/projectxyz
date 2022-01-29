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
var onlineTable = [];
// websocket server inform when user disconnect
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
        res.render("chatLogIn", {
          MESSAGE: "Login failed! please use another account.",
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
                  MESSAGE: "Login failed!, try again!",
                });
              }
            }
          );
        } else {
          res.render("chatLogIn", {
            MESSAGE: "User name does not exist!",
          });
        }
      }
    } else {
      res.render("chatLogIn", {
        MESSAGE: "Login failed!, try again!",
      });
    }
  } else {
    res.render("chatLogIn", {
      MESSAGE: "User name and Password required!",
    });
  }
};
/**
 * handle post image, store avatar file to uploadFile folder
 */
controller.handlePostMedia = (req, res, next) => {
  if (!req.files || !Object.hasOwn(req.files.file, "name")) {
    //res.status(400).send("no file uploaded!").end();
  } else {
    // name file as format : 'from'+fromwho+towho+filename
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
 * handle post avatar, store avatar file to uploadAvatar folder
 */
controller.handlePostAvatar = (req, res, next) => {
  if (!req.files || !Object.hasOwn(req.files.file, "name")) {
    //res.status(400).send("no file uploaded!").end();
  } else {
    // name file as format : 'avatar'+username+filename
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
 * handle post newuser request, check and create new user in database
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
      let x = await getUserPassWord(req.body.user); // check if User name already exists
      if (!x) {
        // create hash password
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
              // add User name and password to database
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
                MESSAGE: "Sign Up faled! please try again.",
              });
            }
          }
        );
      } else {
        res.render("chatSignUp", {
          MESSAGE: "User name already exist!",
        });
      }
    } else {
      res.render("chatSignUp", {
        MESSAGE: "User name or Password don't match requirement!",
      }); // if length of username or password not match requirement or their pattern is not match
    }
  } else {
    res.render("chatSignUp", {
      MESSAGE: "User name and Password required!",
    });
  }
};
module.exports = controller;
