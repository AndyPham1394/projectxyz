/**
 * this module use mongodb
 */
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
 * functions
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
 * insert newUser profile into Users collection => _id/null
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
 * modify User profile
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
 * modify Group profile
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
 * get key and increase key for Per-to-Per chat
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
 * get key and increase key for Group chat
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
 * handle for 'assign' call,
 * return User profile/null
 */
async function assignHandle(frame) {
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
 * handle for 'get' call, return document/null
 */
async function getHandle(frame) {
  if (frame.type.match(/^(per)$/i)) {
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
 * handle for 'message' call
 */
async function messageHandle(frame) {
  if (frame.type.match(/^(per)$/i)) {
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
 * handle for create call
 */
async function createHandle(frame) {
  if (frame.type.match(/^(per)$/i)) {
    let validate = await User.findOne({ name: frame.destination[0] }).catch(
      (err) => null
    );

    if (!validate) return false;
    let res = await Per.findOne({
      $and: [
        { members: { $elemMatch: { $eq: frame.name } } },
        { members: { $elemMatch: { $eq: frame.destination[0] } } },
      ],
    }).catch((err) => null);
    if (!res) {
      let ret = await Per.insertOne({
        members: [frame.name, frame.destination[0]],
        key: 0,
        messages: [],
      }).catch((err) => null);
      if (ret !== null) {
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
 * handle for delete call return list of members in the group
 */
async function deleteHandle(frame) {
  if (frame.type.match(/^(per)$/i)) {
    let res = await Per.deleteOne({
      $and: [
        { members: { $elemMatch: { $eq: frame.name } } },
        { members: { $elemMatch: { $eq: frame.destination[0] } } },
      ],
    }).catch((err) => null);
    if (!res) {
      return false;
    } else if (res.deletedCount) {
      if (res.deleteCount === 0) {
        return false;
      } else {
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
    let validate = await Group.findOne({ name: frame.destination[0] }).catch(
      (err) => null
    );
    if (validate) {
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
 * handle for invite call return group's members
 */
async function inviteHandle(frame) {
  let findUser = await User.findOne({ name: frame.destination[1] }).catch(
    (err) => null
  );
  if (findUser) {
    let group = await Group.findOne({ name: frame.destination[0] }).catch(
      (err) => null
    );
    if (group) {
      if (group.members.includes(frame.name)) {
        let res = await Group.updateOne(
          { name: frame.destination[0] },
          { $addToSet: { members: frame.destination[1] } }
        ).catch((err) => null);
        if (res) {
          if (res.modifiedCount === 1) {
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
 * handle for escape, return members of the group/false
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
model.call = async (commandNumber, frame) => {
  switch (commandNumber) {
    case 1:
      return await assignHandle(frame);
    case 2:
      return await getHandle(frame);
    case 3:
      return await messageHandle(frame);
    case 4:
      return await deleteHandle(frame);
    case 5:
      return await createHandle(frame);
    case 6:
      return await inviteHandle(frame);
    case 7:
      return await escapeHandle(frame);
    case 8:
      return await addAvatarHandle(frame);
    case 9:
      return await getAvatarHandle(frame);
    default:
      break;
  }
};
model.createNewUser = createNewUser;
module.exports = model;
