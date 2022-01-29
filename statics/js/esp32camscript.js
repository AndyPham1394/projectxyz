function myfunc() {
  window.stop();
}
const streamButton = document.getElementById("toggle-stream");
const setdef = document.getElementById("setImage");
const setqua = document.getElementById("setquality");
const setgain = document.getElementById("setgain");
const setmir = document.getElementById("setmirror");
const stream = document.getElementById("stream");
function show(id) {
  let ob = document.getElementById(id);
  ob.classList.remove("hidden");
}
function hide(id) {
  ob.classList.add("hidden");
}

var hostRef = document.location.href;
var baseHost = document.location.hostname;
function startStream() {
  stream.src = hostRef + "/client";
  show("div1");
  streamButton.innerHTML = "Stop Stream";
}
function closeStream() {
  window.stop();
  streamButton.innerHTML = "Start Stream";
}
var socket = new WebSocket(`ws://${baseHost}:81`);
socket.addEventListener("open", (event) => {
  console.log("websocket connected!");
});
setdef.onclick = () => {
  socket.send("batden\n");
};
setqua.onclick = () => {
  socket.send("tatden\n");
};
socket.addEventListener("message", function (event) {
  console.log("Message from server ", event.data);
});
setgain.onmousedown = () => {
  socket.send("phai\n");
};

setmir.onmousedown = () => {
  socket.send("trai\n");
};

streamButton.onclick = () => {
  // stop/start stream data from server
  let streamEnabled = streamButton.innerHTML === "Stop Stream" ? true : false;
  if (streamEnabled) {
    if (socket.OPEN) {
      socket.close();
    }
    closeStream();
  } else {
    if (socket.CLOSED) {
      socket = new WebSocket(`ws://${baseHost}:81`);
    }
    startStream();
  }
};
