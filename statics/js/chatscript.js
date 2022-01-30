const messageBox = document.getElementById("conversation");
const relateBar = document.getElementById("relateBar");
const chosen = document.getElementsByClassName("row sideBar-body");
var focusNameTag = document.getElementById("onFocusName");
var focusAvatar = document.getElementById("focusAvatar");
const messageSound2 = new Audio("./audio/messagesound2.wav");
const messageSound = new Audio("./audio/messagesound.mp3");
const muteButton = document.getElementById("muteButton");
const form = document.getElementById("fileUploadForm");
const avatarUploadForm = document.getElementById("avatarUploadForm");
const fileUpload = document.getElementById("file");
const avatarUpload = document.getElementById("avatarUpload");
const mediaSendTo = document.getElementById("mediaSendTo");
var assign = false;
const USER_NAME = document.getElementById("username").innerHTML;
const SECRET = document.getElementById("secret").innerHTML;
const addUserButton = document.getElementById("addUserButton");
const newGroupButton = document.getElementById("newGroupButton");
const userInfoButton = document.getElementById("userInfoButton");
const inviteButton = document.getElementById("inviteButton");
const escapeButton = document.getElementById("escapeButton");
const deleteButton = document.getElementById("deleteButton");
const commandInput2 = document.getElementById("commandInput2");
const commandInput2Box = document.getElementById("commandInput2Box");
const commentBox = document.getElementById("comment");
const sendButton = document.getElementById("button");
const Box1 = document.getElementById("Box1");
const userProfile = document.getElementById("userProfile");
const userInfoBackButton = document.getElementById("userInfoBackArrow");
const searchBox = document.getElementById("searchBox");
const searchBoxContainer = document.getElementById("searchBoxContainer");
const membersButton = document.getElementById("membersButton");
const groupProfile = document.getElementById("groupProfile");
const groupInfoBackArrow = document.getElementById("groupInfoBackArrow");
const userInfoAvatarChangeButton = document.getElementById(
  "userInfoAvatarChangeButton"
);
/**
 * this script is used to handle command from server and display, store message
 */
///////////////////////////////////////////////////////////////////////////////

console.log("UserName: " + USER_NAME);
var UserInfo = {}; // contain User's info
var onFocus = {}; // object onfocus (when click on an object, their message will be render in the chat box)
var onCommand = "search"; // command we currently use
////////////////////////////////////////////////////
//                    TABLES
var relateTable = []; // contain list of otherclient who User contact with
var groupTable = []; // contain list of group that User is in

// events
fileUpload.addEventListener("change", () => {
  // upload file size less than 15mb
  if (fileUpload.files[0].size >= 0 && fileUpload.files[0].size <= 15728640) {
    var data = new FormData(form);
    jQuery.ajax({
      url: document.location.origin + "/api/chat/postmedia",
      data: data,
      cache: false,
      contentType: false,
      processData: false,
      method: "POST",
      type: "POST", // For jQuery < 1.9
      success: function (data) {
        let fileName = data;
        if (onFocus.type === "per") {
          sendMessage(fileName, "image", onFocus.type, [onFocus.name]);
        } else if (onFocus.type === "group") {
          sendMessage(fileName, "image", onFocus.type, [
            onFocus.name,
            ...groupTable.find((x) => x.name === onFocus.name).members,
          ]);
        }
        fileUpload.value = "";
      },
    });
  } else {
    fileUpload.value = "";
  }
});
avatarUpload.addEventListener("change", () => {
  // maximum file size less than 8mb
  if (
    avatarUpload.files[0].size >= 0 &&
    avatarUpload.files[0].size <= 8388608
  ) {
    var data = new FormData(avatarUploadForm);
    jQuery.ajax({
      url: document.location.origin + "/api/chat/postavatar",
      data: data,
      cache: false,
      contentType: false,
      processData: false,
      method: "POST",
      type: "POST", // For jQuery < 1.9
      success: function (data) {
        if (data.length > 0) {
          sendUploadAvatar(data);
          document.getElementById("infoAvatar").src = `uploadAvatar/${data}`;
          document.getElementById("avatar").src = `uploadAvatar/${data}`;
        }
        avatarUpload.value = "";
      },
    });
  } else {
    alert("Avatar size must be less than 8MB");
    avatarUpload.value = "";
  }
});
muteButton.addEventListener("click", () => {
  if (muteButton.className === "fa fa-bell-slash fa-2x") {
    muteButton.className = "fa fa-bell fa-2x";
    messageSound.muted = true;
    messageSound2.muted = true;
  } else {
    muteButton.className = "fa fa-bell-slash fa-2x";
    messageSound.muted = false;
    messageSound2.muted = false;
  }
});

addUserButton.addEventListener("click", () => {
  searchBox.placeholder = 'Type in User\'s name and "Enter"';
  onCommand = "addUser";
  searchBoxContainer.hidden = false;
  searchBox.focus();
});
newGroupButton.addEventListener("click", () => {
  searchBox.placeholder = 'Input group\'s name and "Enter"';
  onCommand = "newGroup";
  searchBoxContainer.hidden = false;
  searchBox.focus();
});
searchBox.addEventListener("keyup", function (event) {
  event.preventDefault();
  if (event.keyCode === 13) {
    searchClick();
    searchBox.value = "";
    searchBox.placeholder = "";
    onCommand = "search";
  }
});
searchBox.addEventListener("focusout", function () {
  searchBox.placeholder = "";
  onCommand = "search";
  searchBoxContainer.hidden = true;
  searchBox.value = "";
});
commandInput2.addEventListener("focusout", function (event) {
  onCommand = "search";
  commandInput2.value = "";
  commandInput2Box.hidden = true;
});
userInfoButton.addEventListener("click", () => {
  userProfile.hidden = false;
  Box1.hidden = true;
});
userInfoBackButton.addEventListener("click", () => {
  userProfile.hidden = true;
  Box1.hidden = false;
});
inviteButton.addEventListener("click", () => {
  commandInput2Box.hidden = false;
  commandInput2.placeholder = "Input User's name";
  commandInput2.focus();
  onCommand = "invite";
});
escapeButton.addEventListener("click", () => {
  commandInput2Box.hidden = false;
  commandInput2.placeholder = 'Type "OK" to confirm';
  commandInput2.focus();
  onCommand = "escape";
});
deleteButton.addEventListener("click", () => {
  commandInput2Box.hidden = false;
  commandInput2.placeholder = 'Type "OK" to confirm';
  commandInput2.focus();
  onCommand = "delete";
});
commandInput2.addEventListener("keyup", function (event) {
  event.preventDefault();
  if (event.keyCode === 13) {
    commandInput2KeyDown();
    commandInput2.value = "";
    onCommand = "search";
  }
});
membersButton.addEventListener("click", () => {
  Box1.hidden = true;
  groupProfile.hidden = false;
});
groupInfoBackArrow.addEventListener("click", () => {
  Box1.hidden = false;
  groupProfile.hidden = true;
});
sendButton.addEventListener("click", function () {
  sendAction();
});
commentBox.addEventListener("keyup", function (event) {
  event.preventDefault();
  if (event.keyCode === 13) {
    sendAction();
  }
});

/**
 * check value in search box and execute command (add user, new group, search user)
 */
function searchClick() {
  if (onCommand === "addUser") {
    let name = searchBox.value;
    if (name.length > 0) {
      name = name.trim().replaceAll(/\n/g, "");
      sendCreate("per", name);
    }
    searchBox.value = "";
  } else if (onCommand === "newGroup") {
    let name = searchBox.value;
    if (name.length > 0) {
      name = name.trim().replaceAll(/\n/g, "");
      sendCreate("group", name);
    }
  }
  searchBoxContainer.hidden = true;
}
/**
 * check for User confirm in commandInput2 box
 */
function commandInput2KeyDown() {
  if (onCommand === "invite" && onFocus.type === "group") {
    let name = commandInput2.value;
    if (name.length > 0 && name.trim() !== "" && name.length <= 20) {
      name = name.trim().replaceAll(/\n/g, "");
      sendInvite([onFocus.name, name]);
    }
  } else if (onCommand === "escape" && onFocus.type === "group") {
    let val = commandInput2.value;
    if (val.length > 0 && val.trim() !== "" && val.length <= 20) {
      val = val.trim().replaceAll(/\n/g, "");
      if (val.match(/ok/gi)) {
        sendEscape(onFocus.name);
      }
    }
  } else if (onCommand === "delete") {
    let val = commandInput2.value;
    if (val.length > 0 && val.trim() !== "" && val.length <= 20) {
      val = val.trim().replaceAll(/\n/g, "");
      if (val.match(/ok/gi)) {
        sendDelete(onFocus.type, onFocus.name);
      }
    }
  }
  commandInput2.value = "";
  commandInput2.blur();
  commandInput2Box.hidden = true;
}
/**
 * send value in comment box to server
 */
function sendAction() {
  commentBox.value = commentBox.value.replaceAll(/\n/g, "");
  commentBox.value = commentBox.value.trim();
  if (commentBox.value.length > 0) {
    if (onFocus.type === "per") {
      let time = new Date();
      sendMessage(commentBox.value, "text", "per", [onFocus.name]);
      displayOurMessage(commentBox.value, time);
    } else if (onFocus.type === "group") {
      let time = new Date();
      sendMessage(commentBox.value, "text", "group", [
        onFocus.name,
        ...groupTable.find((x) => x.name === onFocus.name).members,
      ]);
      displayOurMessage(commentBox.value, time);
    }
  }
  commentBox.value = "";
}

// get previous messages by onfocus name
function previous() {
  let object = relateTable.find((ob) => ob.name === onFocus.name);
  if (object) {
    sendGet("per", onFocus.name, object.messages[0].id - 1);
  } else {
    object = groupTable.find((ob) => ob.name === onFocus.name);
    sendGet("group", onFocus.name, object.messages[0].id - 1);
  }
}
/**
 * display messages in the chat box
 */
function displayMessage(content, timeString, theirName, sendOrReceive) {
  let float = "";
  if (sendOrReceive && content.length < 39) {
    float = "style='float:right'";
  } else if (!sendOrReceive && content.length < 64) {
    float = "style='float:left'";
  }
  let sr = "receiver";
  if (sendOrReceive) sr = "sender";
  var message = document.createElement("div");
  message.className = "row message-body";
  message.innerHTML =
    '<div class="message-main-' +
    sr +
    '"><div ' +
    float +
    'class="' +
    sr +
    '"><div class="message-text">' +
    content +
    '</div><span class="message-time pull-right">' +
    theirName +
    "" +
    timeString +
    "</span></div></div>";
  messageBox.appendChild(message).scrollIntoView();
}
/**
 * display image in the chat box
 */
function displayImage(imageUrl, timeString, theirName, sendOrReceive) {
  let sr = "receiver";
  if (sendOrReceive) sr = "sender";
  var message = document.createElement("div");
  message.innerHTML =
    '<div class="image-' +
    sr +
    '">' +
    '<div class="image-display">' +
    '<img src="' +
    imageUrl +
    '">' +
    "</div>" +
    '<span class="message-time pull-right">' +
    theirName +
    "-" +
    timeString +
    "</span></div>";
  messageBox.appendChild(message).scrollIntoView();
}
/**
 * stringtifys the time and displays it with messages for our messages
 */
function displayOurMessage(content, time) {
  let timeString = new Date(time).toLocaleTimeString();
  displayMessage(content, timeString, "", true);
}
/**
 * stringtifys the time and displays it with messages for their messages
 */
function displayTheirMessage(content, time, theirName) {
  let timeString = new Date(time).toLocaleTimeString();
  displayMessage(content, timeString, theirName, false);
}
function clearRelationsBar() {
  relateBar.innerHTML = "";
}
/**
 * add a user or group to the relations bar, append click event for them as well
 */
function addRelateBar(name, groupOrPer) {
  var avatar = "img/man-2-512.png";
  if (!groupOrPer) {
    avatar = "img/group.jfif";
  } else {
    let x = relateTable.find((n) => n.name === name);
    if (x.hasOwnProperty("avatar")) {
      avatar = `uploadAvatar/${x.avatar}`;
    }
  }
  let relate = document.createElement("div");
  relate.className = "row sideBar-body";
  relate.innerHTML =
    '<div class="col-sm-3 col-xs-3 sideBar-avatar">' +
    '<div class="avatar-icon">' +
    "<img src=" +
    avatar +
    '></div></div><div class="col-sm-9 col-xs-9 sideBar-main">' +
    '<div class="row"><div class="col-sm-8 col-xs-8 sideBar-name"' +
    `id="${name}-relateBar"` +
    '><span class="name-meta">' +
    name +
    "</span></div></div></div></div>";
  relate.addEventListener("click", () => {
    mediaSendTo.value = name;
    removeUnseenAlert(name);
    if (groupOrPer) {
      membersButton.hidden = true;
      inviteButton.hidden = true;
      escapeButton.hidden = true;
      deleteButton.hidden = false;
      renderMessageBox(name, "per");
      onFocus = {
        name: name,
        type: "per",
      };
      focusNameTag.innerHTML = name;
      focusAvatar.innerHTML = "<img src=" + avatar + ">";
    } else {
      membersButton.hidden = false;
      inviteButton.hidden = false;
      escapeButton.hidden = false;
      deleteButton.hidden = false;
      onFocus = {
        name: name,
        type: "group",
      };
      focusNameTag.innerHTML = name;
      focusAvatar.innerHTML = "<img src=" + avatar + ">";
      renderGroupInfoBar(name);
      renderMessageBox(name, "group");
    }
  });
  relateBar.appendChild(relate);
}
/**
 * add a new user into groups's member box when they join the group
 */
function addGroupInfoBar(name) {
  let avatar = "img/man-2-512.png";
  let relate = document.createElement("div");
  relate.className = "row sideBar-body";
  relate.innerHTML =
    '<div class="col-sm-3 col-xs-3 sideBar-avatar">' +
    '<div class="avatar-icon">' +
    "<img src=" +
    avatar +
    '></div></div><div class="col-sm-9 col-xs-9 sideBar-main">' +
    '<div class="row"><div class="col-sm-8 col-xs-8 sideBar-name"' +
    `id="${name}-relateBar"` +
    '><span class="name-meta">' +
    name +
    "</span></div></div></div></div>";
  document.getElementById("groupMembersBar").appendChild(relate);
}
function renderGroupInfoBar(groupname) {
  document.getElementById("groupMembersBar").innerHTML = "";
  groupTable
    .find((ob) => ob.name === groupname)
    .members.forEach((member) => {
      addGroupInfoBar(member);
    });
}
////////////////////////////////////////////////////
//                  CLIENT WORKS
function getrelateTable() {
  return relateBar.getElementsByClassName("row sideBar-body");
}
/**
 * add name into relate table or group table
 */
function addNameToTables(table, name) {
  let ob = {
    name: name,
    unseenMessages: [],
  };
  table.push(ob);
}
/**
 * add unseen alert to the user/group avatar when receiving new message but not seen
 */
function addUnseenAlert(who) {
  let tag = document.getElementById(who + "-relateBar");
  let dangerLabel = tag.getElementsByClassName("label label-danger");
  if (dangerLabel[0]) {
    dangerLabel[0].innerHTML = parseInt(dangerLabel[0].innerHTML) + 1;
  } else {
    dangerLabel = document.createElement("span");
    dangerLabel.className = "label label-danger";
    dangerLabel.innerHTML = 1;
    tag.appendChild(dangerLabel);
  }
}
/**
 * remove alert from the user name
 */
function removeUnseenAlert(who) {
  let tag = document.getElementById(who + "-relateBar");
  let dangerLabel = tag.getElementsByClassName("label label-danger");
  if (dangerLabel[0]) {
    dangerLabel[0].remove();
  }
}
/**
 * use group/relate table to display their avatar on the side bar
 */
function renderRelationsBar() {
  clearRelationsBar();
  groupTable.forEach((ob) => {
    addRelateBar(ob.name, false);
  });
  relateTable.forEach((ob) => {
    addRelateBar(ob.name, true);
  });
}
/**
 * render message Box using the name and type of object we focus on
 */
function renderMessageBox(name, type) {
  // rerender message box
  messageBox.innerHTML =
    '<div class="row message-previous">' +
    '<div class="col-sm-12 previous">' +
    '<a onclick="previous(this)">' +
    "Show previous messages" +
    "</a>" +
    "</div>" +
    "</div>";
  if (type === "per") {
    let object = relateTable.find((ob) => ob.name === name);
    if (object.messages) {
      object.messages.forEach((mes) => {
        if (mes.from === USER_NAME) {
          if (mes.content_type === "text") {
            displayOurMessage(mes.content, mes.time);
          } else {
            displayImage(
              `uploadFile/from${USER_NAME}to${object.name}-${mes.content}`,
              new Date(mes.time).toLocaleTimeString(),
              USER_NAME,
              true
            );
          }
        } else {
          if (mes.content_type === "text") {
            displayTheirMessage(mes.content, mes.time, "");
          } else {
            displayImage(
              `uploadFile/from${object.name}to${USER_NAME}-${mes.content}`,
              new Date(mes.time).toLocaleTimeString(),
              object.name,
              false
            );
          }
        }
      });
    }
    // render unseen messages and clear unseen messages list
    if (object.unseenMessages) {
      object.unseenMessages.forEach((mes) => {
        if (mes.content_type === "text") {
          displayTheirMessage(mes.content, mes.time, "");
        } else {
          displayImage(
            `uploadFile/from${object.name}to${USER_NAME}-${mes.content}`,
            new Date(mes.time).toLocaleTimeString(),
            object.name,
            false
          );
        }
        object.messages.push(mes);
      });
      object.unseenMessages = [];
    }
  } else if (type === "group") {
    let object = groupTable.find((ob) => ob.name === name);
    if (object.messages) {
      object.messages.forEach((mes) => {
        if (mes.from === USER_NAME) {
          if (mes.content_type === "text") {
            displayOurMessage(mes.content, mes.time);
          } else {
            displayImage(
              `uploadFile/from${mes.from}to${object.name}-${mes.content}`,
              new Date(mes.time).toLocaleTimeString(),
              mes.from,
              true
            );
          }
        } else {
          if (mes.content_type === "text") {
            displayTheirMessage(mes.content, mes.time, mes.from + "-");
          } else {
            displayImage(
              `uploadFile/from${mes.from}to${object.name}-${mes.content}`,
              new Date(mes.time).toLocaleTimeString(),
              mes.from,
              false
            );
          }
        }
      });
    }
    // render ca unseen va push unseen vao messsages roi xoa unseen
    if (object.unseenMessages) {
      object.unseenMessages.forEach((mes) => {
        if (mes.content_type === "text") {
          displayTheirMessage(mes.content, mes.time, mes.from + "-");
        } else {
          displayImage(
            `uploadFile/from${mes.from}to${object.name}-${mes.content}`,
            new Date(mes.time).toLocaleTimeString(),
            mes.from,
            false
          );
        }
        object.messages.push(mes);
      });
    }
    object.unseenMessages = [];
  }
}

// connect to websocket server
let hostname = document.location.hostname;
const socket = new WebSocket(`ws://${hostname}:88/api/chat`);
socket.addEventListener("open", (event) => {
  console.log("websocket connected!");
  let message = JSON.stringify({
    control: "assign",
    name: USER_NAME,
    secret: SECRET,
  });
  socket.send(message);
});
// if websocket is closed or error, reload page
socket.addEventListener("close", (ev) => {
  setTimeout(() => {
    location.reload();
  }, 2000);
});
socket.addEventListener("error", (ev) => {
  setTimeout(() => {
    location.reload();
  }, 2000);
});
// handle messages from websocket server in json format
socket.addEventListener("message", (message) => {
  let frame = JSON.parse(message.data);
  if (frame && frame.hasOwnProperty("control")) {
    switch (frame.control) {
      // when we assign into ws_server successfully, server will send back a list of group and relate
      // we can use those list to send get request to server to get messages by name
      case "assign":
        if (!assign) {
          delete frame.control;
          UserInfo = frame;
          frame.groups.forEach((name) => {
            addNameToTables(groupTable, name);
            sendGet("group", name, -1);
          });
          frame.relate.forEach((name) => {
            addNameToTables(relateTable, name);
            sendGet("per", name, -1);
          });
          sendGetAvatar(frame.relate);
          if (Object.hasOwn(frame, "avatar")) {
            document.getElementById(
              "avatar"
            ).src = `uploadAvatar/${frame.avatar}`;
            document.getElementById(
              "infoAvatar"
            ).src = `uploadAvatar/${frame.avatar}`;
          }
          renderRelationsBar();
          if (frame.relate.findIndex((ob) => ob === "ADMIN") === -1) {
            sendCreate("per", "ADMIN");
          }
          assign = true;
        }
        break;
      case "get":
        // server response to get request, each of get request must specify type and name, server will send back a list of messages(20)
        switch (frame.type) {
          case "group":
            let group = groupTable.find((ob) => ob.name === frame.message.name);
            if (Object.hasOwn(group, "messages")) {
              group.messages.unshift(...frame.message.messages);
            } else {
              group.messages = frame.message.messages;
            }
            group.messageNum = frame.message.key;
            group.members = frame.message.members;
            if (group.name === onFocus.name) {
              renderMessageBox(onFocus.name, "group");
            }
            break;
          case "per":
            let per = relateTable.find((ob) =>
              frame.message.members.includes(ob.name)
            );
            if (Object.hasOwn(per, "messages")) {
              per.messages.unshift(...frame.message.messages);
            } else {
              per.messages = frame.message.messages;
            }
            per.messageNum = frame.message.key;
            if (per.name === onFocus.name) {
              renderMessageBox(onFocus.name, "per");
            }
            break;
          default:
            break;
        }
        break;
      case "message":
        // server send message command to client whenever there is a new message from others to us or just echo back our message
        // to indicate that server has received our message, this command will be identical to our message command we sent to server
        if (frame.type === "per") {
          // if message from object we onfocus, display it, otherwise push it to unseenMessages list of that object
          if (frame.name === onFocus.name) {
            if (frame.content_type === "text") {
              displayTheirMessage(frame.message, frame.time, "");
            } else {
              displayImage(
                `uploadFile/from${frame.name}to${USER_NAME}-${frame.message}`,
                new Date(frame.time).toLocaleTimeString(),
                frame.name,
                false
              );
            }
            relateTable
              .find((ob) => ob.name === frame.name)
              .messages.push({
                from: frame.name,
                content: frame.message,
                content_type: frame.content_type,
                time: frame.time,
              });
            messageSound.play();
          } else if (frame.name === USER_NAME) {
            // if this is our message, display image message only, text messages are displayed in messageBox directly when we do sendAction()
            if (frame.content_type === "image") {
              displayImage(
                `uploadFile/from${USER_NAME}to${frame.destination[0]}-${frame.message}`,
                new Date(frame.time).toLocaleTimeString(),
                frame.name,
                true
              );
            }
            relateTable
              .find((ob) => ob.name === frame.destination[0])
              .unseenMessages.push({
                from: frame.name,
                content: frame.message,
                content_type: frame.content_type,
                time: frame.time,
              });
          } else {
            relateTable
              .find((ob) => ob.name === frame.name)
              .unseenMessages.push({
                from: frame.name,
                content: frame.message,
                content_type: frame.content_type,
                time: frame.time,
              });
            messageSound2.play();
            addUnseenAlert(frame.name);
          }
        } else if (frame.type === "group") {
          if (frame.destination[0] === onFocus.name) {
            if (frame.name !== USER_NAME) {
              if (frame.content_type === "text") {
                displayTheirMessage(
                  frame.message,
                  frame.time,
                  frame.name + "-"
                );
              } else {
                displayImage(
                  `uploadFile/from${frame.name}to${frame.destination[0]}-${frame.message}`,
                  new Date(frame.time).toLocaleTimeString(),
                  frame.name,
                  false
                );
              }
              messageSound.play();
            } else {
              // tin nhan tu User
              if (frame.content_type === "image") {
                displayImage(
                  `uploadFile/from${USER_NAME}to${frame.destination[0]}-${frame.message}`,
                  new Date(frame.time).toLocaleTimeString(),
                  USER_NAME,
                  true
                );
              }
            }
            groupTable
              .find((ob) => ob.name === frame.destination[0])
              .messages.push({
                from: frame.name,
                content: frame.message,
                content_type: frame.content_type,
                time: frame.time,
              });
          } else {
            groupTable
              .find((ob) => ob.name === frame.destination[0])
              .unseenMessages.push({
                from: frame.name,
                content: frame.message,
                content_type: frame.content_type,
                time: frame.time,
              });
            messageSound2.play();
            addUnseenAlert(frame.destination[0]);
          }
        }
        break;
      case "delete":
        // server send delete command to client whenever someone delete a chat with us or a group is deleted
        console.log("received delete command from ", frame.name);
        console.log("object be deleted :", frame.destination[0]);
        console.log("type :", frame.type);
        if (frame.type === "per") {
          // for personal chat
          if (frame.name === USER_NAME) {
            // if delete command is sent by us, find object to deleted in destination [0]
            // and delete it in relateTable, rerender relationBar
            let indexOfDeletedPer = relateTable.findIndex(
              (ob) => ob.name === frame.destination[0]
            );
            if (indexOfDeletedPer !== -1) {
              relateTable.splice(indexOfDeletedPer, 1);
              renderRelationsBar();
              return;
            }
          } else {
            let indexOfDeletedPer = relateTable.findIndex(
              (ob) => ob.name === frame.name
            );
            if (indexOfDeletedPer !== -1) {
              relateTable.splice(indexOfDeletedPer, 1);
              renderRelationsBar();
              return;
            }
          }
        } else if (frame.type === "group") {
          // delete group in groupTable and rerender relationBar
          let indexOfDeletedGroup = groupTable.findIndex(
            (ob) => ob.name === frame.destination[0]
          );
          if (indexOfDeletedGroup !== -1) {
            groupTable.splice(indexOfDeletedGroup, 1);
            renderRelationsBar();
            return;
          }
        }
        break;
      case "create":
        // add object name into relateTable/groupTable and rerender relationBar
        console.log("received create command from ", frame.name);
        console.log("object to be create :", frame.destination[0]);
        console.log("type :", frame.type);
        if (frame.type === "per") {
          if (frame.name === USER_NAME) {
            relateTable.push({
              name: frame.destination[0],
              messages: [],
              unseenMessages: [],
            });
            renderRelationsBar();
            return;
          } else {
            relateTable.push({
              name: frame.name,
              messages: [],
              unseenMessages: [],
            });
            renderRelationsBar();
            return;
          }
        } else if (frame.type === "group") {
          groupTable.push({
            name: frame.destination[0],
            members: [],
            messages: [],
            unseenMessages: [],
          });
          renderRelationsBar();
          return;
        }
        break;
      case "invite":
        // server send invite command to client whenever someone invite us to a group or our group has new member
        console.log("received invite command from ", frame.name);
        console.log(
          "group :" + frame.destination[0] + "- user :" + frame.destination[1]
        );
        // if this command was not sent by us
        if (frame.name !== USER_NAME) {
          // we don't have this group's name in groupTable means we invited into this group
          if (
            groupTable.findIndex((ob) => ob.name === frame.destination[0]) ===
            -1
          ) {
            groupTable.push({
              name: frame.destination[0],
              messages: [],
              unseenMessages: [],
            });
            renderRelationsBar();
            sendGet("group", frame.destination[0], -1);
            console.log(
              "you have been invited in to group : ",
              frame.destination[0] + " by : " + frame.name
            );
          } else {
            // if we have this group's name in groupTable, then there are new member invited to this group
            console.log(
              "group " +
                frame.destination[0] +
                " added new member: " +
                frame.destination[1]
            );
            groupTable
              .find((ob) => ob.name === frame.destination[0])
              .members.push(frame.destination[1]);
          }
        } else {
          // if this command sent by us, add new member to group members list
          let gr = groupTable.find((ob) => ob.name === frame.destination[0]);
          if (gr) gr.members.push(frame.destination[1]);
        }
        break;
      case "escape":
        // server send escape command to client whenever someone leave a group
        console.log("received escape command from ", frame.name);
        console.log("group :" + frame.destination[0]);
        if (frame.name === USER_NAME) {
          // if our command, remove this group from groupTable rerender relationBar
          let indexOfEscapeGroup = groupTable.findIndex(
            (ob) => ob.name === frame.destination[0]
          );
          if (indexOfEscapeGroup !== -1) {
            groupTable.splice(indexOfEscapeGroup, 1);
            renderRelationsBar();
            console.log("deleted :" + frame.destination[0]);
            return;
          }
        } else {
          // if someone else's command then remove this member from group's member
          let findGroup = groupTable.find((ob) => ob.name === frame.name);
          if (findGroup !== undefined) {
            let indexofEscapeMember = findGroup.members.findIndex(
              (ob) => ob === frame.name
            );
            if (indexofEscapeMember !== -1) {
              findGroup.members.splice(indexofEscapeMember, 1);
            }
            return;
          }
        }
        break;
      case "getavatar":
        // server send back list of users and their avatar name when we send getavatar command
        // add them into relateTable and render relationBar
        if (frame.hasOwnProperty("avatarlist")) {
          frame.avatarlist.forEach((ob) => {
            relateTable.find((x) => x.name === ob.name).avatar = ob.avatar;
          });
          renderRelationsBar();
        }
        break;
    }
  }
});
/////////////////////////////////////////////
//            COMMAND WE SEND TO SERVER
function sendGet(type, dest, fromNumber) {
  let mes = JSON.stringify({
    control: "get",
    type: type,
    from: fromNumber,
    destination: [dest],
  });
  socket.send(mes);
}
function sendGetAvatar(who) {
  let mes = JSON.stringify({
    control: "getavatar",
    who: who,
  });
  socket.send(mes);
}
function sendUploadAvatar(fileName) {
  let mes = JSON.stringify({
    control: "avatarupload",
    filename: fileName,
  });
  socket.send(mes);
}
function sendMessage(content, contentType, type, dest) {
  let mes = JSON.stringify({
    control: "message",
    type: type,
    destination: dest,
    content_type: contentType,
    message: content,
  });
  socket.send(mes);
}
function sendDelete(type, dest) {
  let mes = JSON.stringify({
    control: "delete",
    type: type,
    destination: [dest],
  });
  socket.send(mes);
}
function sendCreate(type, dest) {
  let mes = JSON.stringify({
    control: "create",
    type: type,
    destination: [dest],
  });
  socket.send(mes);
}
function sendInvite(dest) {
  let mes = JSON.stringify({
    control: "invite",
    destination: dest,
  });
  socket.send(mes);
}
function sendEscape(dest) {
  let mes = JSON.stringify({
    control: "escape",
    destination: [dest],
  });
  socket.send(mes);
}
