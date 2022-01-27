// module dataModel của websocketServer, làm nhiệm vụ kết nối với mongoDBserver, CRUD data với server
// để trao đổi data qua lại giữa controller và DBserver
const { MongoClient } = require("mongodb");
const { EventEmitter } = require("stream");
var client = new MongoClient(process.env.MONGOURL);
client.connect(async (ret) => {
  console.log("chat's websocket server mongodb connected!");
});
const User = client.db("chat").collection("Users");
const Group = client.db("chat").collection("Groups");
const Per = client.db("chat").collection("Pers");
/**
 * các functions tạo và chỉnh sửa
 * + createNewUser
 * + userModifier
 * + groupModifier
 * + autoIdPer (tự tạo id cho các message mới trong messages array)
 * + autoIdGroup
 * +++++++++++++++++
 *   handles cho các call (9)
 * + assignHandle
 * + messageHandle
 * + createHandle
 * + getHandle
 * + deleteHandle
 * + inviteHandle
 * + escapeHandle
 * + addAvatarHandle
 * + getAvatarHandle
 */

/**
 * insert newUser profile vào Users collection => _id/null
 */
async function createNewUser(uName) {
  let search = await User.findOne({ name: uName });
  let search2 = await Group.findOne({ name: uName });
  if (!search && !search2) {
    let ob = {
      name: uName,
      dayJoin: new Date(),
      relate: [],
      groups: [],
      assign: [new Date()],
    };
    let ret = await User.insertOne(ob)
      .then((res) => {
        return res.insertedId;
      })
      .catch((err) => {
        return null;
      });
    return ret;
  } else {
    return null;
  }
}
/**
 * chỉnh sửa User profile
 */
async function userModifier(uName, mod) {
  let search = await User.findOneAndUpdate({ name: uName }, mod)
    .then((res) => {
      return res;
    })
    .catch((err) => {
      return null;
    });
  if (search) {
    return search;
  } else {
    return null;
  }
}
/**
 * chỉnh sửa Group profile
 */
async function groupModifier(gName, mod) {
  let search = await Group.findOneAndUpdate({ name: gName }, mod)
    .then((res) => {
      return res;
    })
    .catch((err) => {
      return null;
    });
  if (search) {
    return search;
  } else {
    return null;
  }
}
/**
 * cập nhật key trong doc và return new key cho per
 */
async function autoIdPer(name1, name2) {
  let res = await Per.findOneAndUpdate(
    {
      $and: [
        { members: { $elemMatch: { $eq: name1 } } },
        { members: { $elemMatch: { $eq: name2 } } },
      ],
    },
    { $inc: { key: 1 } }
  );
  if (res.value) {
    return res.value.key + 1;
  } else {
    return 0;
  }
}
/**
 * cập nhật key trong doc và return new key cho group
 */
async function autoIdGroup(gname) {
  let res = await Group.findOneAndUpdate({ name: gname }, { $inc: { key: 1 } });
  if (res.value) {
    return res.value.key + 1;
  } else {
    return 0;
  }
}
/**
 * handle cho 'assign' call,
 * return User profile/null
 */
async function assignHandle(frame) {
  // push thêm date vào assign array trong Users và return data
  // await User;
  let res = await User.findOneAndUpdate(
    { name: frame.name },
    { $push: { assign: frame.time } }
  ).catch((err) => err);
  if (res) {
    if (res.value) {
      return res.value;
    } else return null;
  }
  return null;
}
/**
 * handle cho 'get' call, return document/null
 */
async function getHandle(frame) {
  if (frame.type.match(/^(per)$/i)) {
    // tìm per thì tìm doc nào có members là tên chủ và tên khách và return 20 messages tùy vị trí bắt đầu
    let from = frame.from;
    let mesnum = 20;
    if (frame.from === -1) {
      from = -20;
    } else if (from <= 20) {
      from = 0;
      mesnum = frame.from;
    } else if (from > 20) {
      from = from - 20;
    }
    let getDoc = await Per.aggregate([
      {
        $match: {
          $and: [
            { members: { $elemMatch: { $eq: frame.name } } },
            { members: { $elemMatch: { $eq: frame.destination[0] } } },
          ],
        },
      },
      {
        $project: {
          members: 1,
          key: 1,
          messages: {
            $slice: ["$messages", from, mesnum],
          },
        },
      },
    ])
      .toArray()
      .catch((err) => null);
    if (getDoc) {
      return getDoc[0];
    }
    return null;
  } else if (frame.type.match(/^(group)$/i)) {
    // tìm doc nào có name giống document
    // use aggregatin get 20 messages from messages array from mongoDB
    let from = frame.from;
    let mesnum = 20;
    if (frame.from === -1) {
      from = -20;
    } else if (from <= 20) {
      from = 0;
      mesnum = frame.from;
    } else if (from > 20) {
      from = from - 20;
    }
    let getDoc = await Group.aggregate([
      {
        $match: {
          name: frame.destination[0],
        },
      },
      {
        $project: {
          name: 1,
          members: 1,
          key: 1,
          messages: {
            $slice: ["$messages", from, mesnum],
          },
        },
      },
    ])
      .toArray()
      .catch((err) => null);
    if (getDoc) {
      return getDoc[0];
    }
    return null;
  }
  return null;
}
/**
 * handle cho 'message' call, lưu message vào doc tùy theo frame.type
 */
async function messageHandle(frame) {
  if (frame.type.match(/^(per)$/i)) {
    // push message vào
    let res = await Per.updateOne(
      {
        $and: [
          { members: { $elemMatch: { $eq: frame.name } } },
          { members: { $elemMatch: { $eq: frame.destination[0] } } },
        ],
      },
      {
        $push: {
          messages: {
            id: await autoIdPer(frame.name, frame.destination[0]),
            time: frame.time,
            from: frame.name,
            content_type: frame.content_type,
            content: frame.message,
          },
        },
      }
    ).catch((err) => null);
    if (res) {
      if (res.modifiedCount === 1) {
        return true;
      } else {
        return false;
      }
    }
    return false;
  } else if (frame.type.match(/^(group)$/i)) {
    let res = await Group.updateOne(
      { name: frame.destination[0] },
      {
        $push: {
          messages: {
            id: await autoIdGroup(frame.destination[0]),
            time: frame.time,
            from: frame.name,
            content_type: frame.content_type,
            content: frame.message,
          },
        },
      }
    ).catch((err) => null);
    if (res) {
      if (res.modifiedCount === 1) return true;
      else return false;
    } else return false;
  }
  return false;
}
/**
 * handle cho create call, thêm một group/per document vào collection,
 */
async function createHandle(frame) {
  if (frame.type.match(/^(per)$/i)) {
    // người được nhắn tin đến phải tồn tại
    let validate = await User.findOne({ name: frame.destination[0] }).catch(
      (err) => null
    );

    if (!validate) return false;
    // kiểm tra nếu per này đã tồn tại hay chưa, nếu chưa thì tiếp tục
    let res = await Per.findOne({
      $and: [
        { members: { $elemMatch: { $eq: frame.name } } },
        { members: { $elemMatch: { $eq: frame.destination[0] } } },
      ],
    }).catch((err) => null);
    if (!res) {
      // add Per to csdl
      let ret = await Per.insertOne({
        members: [frame.name, frame.destination[0]],
        key: 0,
        messages: [],
      }).catch((err) => null);
      if (ret !== null) {
        // nếu insertOne không err => push thêm tên vào relate profile của 2 User
        // và return true
        await User.updateOne(
          { name: frame.name },
          { $addToSet: { relate: frame.destination[0] } }
        ).catch((err) => null);
        await User.updateOne(
          { name: frame.destination[0] },
          { $addToSet: { relate: frame.name } }
        ).catch((err) => null);
        return true;
      }
      return false;
    }
    return false;
  } else if (frame.type.match(/^(group)$/i)) {
    let validate = await User.findOne({ name: frame.destination[0] }).catch(
      (err) => null
    ); // group's name and user's name must not identical
    let res = await Group.findOne({ name: frame.destination[0] }).catch(
      (err) => null
    );
    if (!res && !validate) {
      let ret = await Group.insertOne({
        name: frame.destination[0],
        members: [frame.name],
        key: 0,
        messages: [],
      }).catch((err) => null);
      if (ret !== null) {
        await User.updateOne(
          { name: frame.name },
          { $addToSet: { groups: frame.destination[0] } }
        ).catch((err) => null);
        return true;
      }
      return false;
    }
    return false;
  } else {
    return false;
  }
}
/**
 * handle cho delete call, xóa doc trong bảng Groups hoặc Pers
 */
async function deleteHandle(frame) {
  // type == per
  if (frame.type.match(/^(per)$/i)) {
    // xóa per
    let res = await Per.deleteOne({
      $and: [
        { members: { $elemMatch: { $eq: frame.name } } },
        { members: { $elemMatch: { $eq: frame.destination[0] } } },
      ],
    }).catch((err) => null);
    // xóa tên trong relate của client
    if (!res) {
      return false;
    } else if (res.deletedCount) {
      // nếu xóa thành công
      if (res.deleteCount === 0) {
        return false;
      } else {
        // xoá tên trong relateList của 2 người
        await User.findOne({ name: frame.name }).catch((err) => null);
        let ret = await User.updateOne(
          { name: frame.name },
          { $pull: { relate: frame.destination[0] } }
        ).catch((err) => null);
        let ret2 = await User.updateOne(
          { name: frame.destination[0] },
          { $pull: { relate: frame.name } }
        ).catch((err) => null);
        await User.findOne({ name: frame.destination[0] }).catch((err) => null);
        if (ret && ret2) {
          return [frame.name, frame.destination[0]];
        }
        return false;
      }
    }
    return false;
  } else if (frame.type.match(/^(group)$/i)) {
    // find group
    let validate = await Group.findOne({ name: frame.destination[0] }).catch(
      (err) => null
    );
    if (validate) {
      // nếu là thành viên đầu tiên mới có thể xóa group được
      if (validate.members[0] === frame.name) {
        let res = await Group.deleteOne({ name: frame.destination[0] }).catch(
          (err) => {
            return null;
          }
        );
        if (!res) {
          return false;
        } else if (res.deletedCount) {
          if (res.deleteCount === 0) {
            return false;
          } else {
            // xóa tên của group trong User profile của các thành viên trong group
            validate.members.forEach(async (member) => {
              await User.updateOne(
                { name: member },
                { $pull: { groups: frame.destination[0] } }
              ).catch((err) => null);
            });
            return validate.members;
          }
        }
        return false;
      }
      return false;
    }
    return false;
  } else {
    return false;
  }
}
/**
 * mời một client vào group, người mời phải là thành viên của group
 */
async function inviteHandle(frame) {
  // nếu người được mời có tồn tại
  let findUser = await User.findOne({ name: frame.destination[1] }).catch(
    (err) => null
  );
  if (findUser) {
    // nếu group có tồn tại
    let group = await Group.findOne({ name: frame.destination[0] }).catch(
      (err) => null
    );
    if (group) {
      // người mời phải trong group's members mới có thể mời người khác được
      if (group.members.includes(frame.name)) {
        let res = await Group.updateOne(
          { name: frame.destination[0] },
          { $addToSet: { members: frame.destination[1] } }
        ).catch((err) => null);
        if (res) {
          if (res.modifiedCount === 1) {
            // nếu thêm thành công
            await User.updateOne(
              { name: frame.destination[1] },
              { $addToSet: { groups: frame.destination[0] } }
            ).catch((err) => null);
            return group.members;
          }
          return false;
        }
        return false;
      }
      return false;
    }
    return false;
  }
  return false;
}
/**
 * handle cho escape, return true/false
 */
async function escapeHandle(frame) {
  var validate = await Group.findOne({ name: frame.destination[0] }).catch(
    (err) => null
  );
  if (validate) {
    const position = validate.members.indexOf(frame.name);
    if (position >= 0) {
      let thaydoi = await Group.updateOne(
        { name: frame.destination[0] },
        { $pull: { members: frame.name } }
      ).catch((err) => null);
      if (thaydoi) {
        if (thaydoi.modifiedCount === 1) {
          await User.updateOne(
            { name: frame.name },
            { $pull: { groups: frame.destination[0] } }
          ).catch((err) => null);
          return validate.members;
        }
        return false;
      } else return false;
    } else {
      return false;
    }
  }
  return false;
}
/**
 * add avatar's url to user's profile
 */
async function addAvatarHandle(frame) {
  let res = await User.updateOne(
    { name: frame.name },
    { $set: { avatar: frame.filename } }
  ).catch((err) => null);
  if (res) {
    if (res.modifiedCount === 1) {
      return true;
    }
    return false;
  }
  return false;
}
/**
 * return list of user's name and their avatar url
 */
async function getAvatarHandle(frame) {
  var listOfAvatar = await User.aggregate([
    {
      $match: {
        $and: [
          {
            name: {
              $in: frame.who,
            },
          },
          {
            avatar: {
              $exists: 1,
            },
          },
        ],
      },
    },
    {
      $project: {
        _id: 0,
        relate: 0,
        groups: 0,
        assign: 0,
        dayJoin: 0,
      },
    },
  ])
    .toArray()
    .catch((err) => null);
  if (listOfAvatar) {
    return listOfAvatar;
  }
  return null;
}

const model = new EventEmitter();
/**
 * handle các call từ controller
 */
model.call = async (commandNumber, frame) => {
  switch (commandNumber) {
    case 1:
      return await assignHandle(frame); // return User profile
    case 2:
      return await getHandle(frame); // return message array
    case 3:
      return await messageHandle(frame); // return true/false
    case 4:
      return await deleteHandle(frame); // return true/false
    case 5:
      return await createHandle(frame); // return true/ false
    case 6:
      return await inviteHandle(frame); // return true/false
    case 7:
      return await escapeHandle(frame); // return true/false
    case 8:
      return await addAvatarHandle(frame); // return true/false
    case 9:
      return await getAvatarHandle(frame); // return true/false
    default:
      break;
  }
};
model.createNewUser = createNewUser;
module.exports = model;
