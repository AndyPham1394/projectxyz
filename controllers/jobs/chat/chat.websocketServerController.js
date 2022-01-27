// controller của websocket,
// module trung gian giữa websocketServer và Model, module này sẽ nhận các message được gửi đến từ router
// và gửi message đến các user liên quan đến message đó, và lưu giữ message vào cơ sở dữ liệu tương ứng
const { EventEmitter } = require("stream");
const Model = require("./chat.websocketServerModel");
const controller = new EventEmitter();
const fs = require("fs");
/**
 * xử lý messagecall đến từ serverRouter
 * check các input từ client trước khi call model, các command phải đủ các field
 * type của các input phải đúng
 */
controller.call = async (frame) => {
  // thêm time vào frame
  frame.time = new Date();
  if (Object.hasOwn(frame, "control")) {
    switch (frame.control) {
      case "assign": {
        if (typeof frame.name === "string") {
          let res = await Model.call(1, frame);
          if (res !== null) {
            delete res.assign;
            delete res._id;
            res.control = "assign";
            controller.emit("assignReturn", res);
          }
        }
        break;
      }
      // get User's profile info
      case "get": {
        if (
          Object.hasOwn(frame, "name") &&
          Object.hasOwn(frame, "type") &&
          Object.hasOwn(frame, "destination") &&
          Object.hasOwn(frame, "from")
        ) {
          // typecheck
          if (
            typeof frame.name !== "string" ||
            typeof frame.type !== "string" ||
            !Array.isArray(frame.destination) ||
            typeof frame.from !== "number"
          ) {
            break;
          } else if (
            frame.type.length > 20 ||
            frame.destination[0].length > 20
          ) {
            break;
          }
          // tùy theo yêu cầu của client mà chọn vị trí message sẽ gửi
          // tối đa 20 message
          if (Number.isInteger(frame.from)) {
            let ret = await Model.call(2, frame);
            if (ret) {
              delete ret._id;
              let mes = {
                origin: frame.name,
                message: ret,
                control: "get",
                type: frame.type,
              };
              controller.emit("getReturn", mes);
            }
          } else {
            let mes = {
              origin: frame.name,
              message: "error",
            };
            controller.emit("getReturn", mes);
          }
        }
        /* get command, lấy thông tin cần thiết tùy vào các argument của get, như type, destination, from 
            lấy data từ mongodb và gửi lại cho client
          */
        break;
      }
      case "message": {
        if (
          Object.hasOwn(frame, "name") &&
          Object.hasOwn(frame, "type") &&
          Object.hasOwn(frame, "destination") &&
          Object.hasOwn(frame, "message")
        ) {
          if (
            typeof frame.name !== "string" ||
            typeof frame.type !== "string" ||
            !Array.isArray(frame.destination) ||
            typeof frame.message !== "string" ||
            frame.destination.some((ob) => ob.length > 20)
          ) {
            break;
          } else if (frame.type.length > 20 || frame.message.length > 500) {
            break;
          }
          controller.emit("messageReturn", frame);
          await Model.call(3, frame);
        }
        break;
      }
      case "delete": {
        if (
          Object.hasOwn(frame, "name") &&
          Object.hasOwn(frame, "type") &&
          Object.hasOwn(frame, "destination")
        ) {
          if (
            typeof frame.name !== "string" ||
            typeof frame.type !== "string" ||
            !Array.isArray(frame.destination)
          ) {
            break;
          } else if (
            frame.type.length > 20 ||
            frame.destination[0].length > 20
          ) {
            break;
          }
          // return danh sách các members
          let res = await Model.call(4, frame);
          if (res) {
            // emit thông báo delete đến các thành viên
            let mes = {
              members: res,
              frame: frame,
            };
            controller.emit("deleteReturn", mes);
          }
        }
        break;
      }
      case "create": {
        if (
          Object.hasOwn(frame, "name") &&
          Object.hasOwn(frame, "type") &&
          Object.hasOwn(frame, "destination")
        ) {
          if (
            typeof frame.name !== "string" ||
            typeof frame.type !== "string" ||
            !Array.isArray(frame.destination)
          ) {
            break;
          } else if (
            frame.type.length > 20 ||
            frame.destination[0].length > 20
          ) {
            break;
          }
          // return true/false
          let res = await Model.call(5, frame);
          if (res) {
            // emit thông báo create đến các thành viên
            controller.emit("createReturn", frame);
          }
        }
        break;
      }
      case "invite": {
        if (
          Object.hasOwn(frame, "name") &&
          Object.hasOwn(frame, "destination")
        ) {
          if (
            typeof frame.name !== "string" ||
            !Array.isArray(frame.destination)
          ) {
            break;
          } else if (
            frame.type.length > 20 ||
            frame.destination[0].length > 20
          ) {
            break;
          }
          // return true/false
          let res = await Model.call(6, frame);
          if (res) {
            // emit thông báo invite đến các thành viên
            let mes = {
              members: [frame.destination[1], ...res],
              frame: frame,
            };
            controller.emit("inviteReturn", mes);
          }
        }
        break;
      }
      case "escape": {
        if (
          Object.hasOwn(frame, "name") &&
          Object.hasOwn(frame, "destination")
        ) {
          if (
            typeof frame.name !== "string" ||
            !Array.isArray(frame.destination)
          ) {
            break;
          } else if (
            frame.type.length > 20 ||
            frame.destination[0].length > 20
          ) {
            break;
          }
          // return danh sách các member trong nhóm
          let res = await Model.call(7, frame);
          if (res) {
            // emit thông báo đến người trong nhóm
            let mes = {
              members: res,
              frame: frame,
            };
            controller.emit("escapeReturn", mes);
          }
        }
        break;
      }
      case "avatarupload": {
        if (Object.hasOwn(frame, "name") && Object.hasOwn(frame, "filename")) {
          if (frame.name.length > 20) {
            break;
          }
          let res = await Model.call(8, frame);
          // if (res) {
          //   controller.emit("avataruploadReturn", res);
          // }
        }
        break;
      }
      case "getavatar": {
        if (Object.hasOwn(frame, "name") && Object.hasOwn(frame, "who")) {
          if (
            typeof frame.name !== "string" ||
            !Array.isArray(frame.who) ||
            frame.who.some((x) => x.length > 20)
          ) {
            break;
          }
          let res = await Model.call(9, frame);
          if (res) {
            let mes = {
              name: frame.name,
              control: frame.control,
              avatarlist: res,
            };
            controller.emit("getavatarReturn", mes);
          }
        }
        break;
      }
      default: {
        console.log("router da call, default : ", frame.toString());
        break;
      }
    }
  } else {
  }
};

module.exports = controller;
