var E = require('./shared.js');

// =============================================================================
//  服务端
// =============================================================================
function initGame() {
  E.prepID(E.MAX_ID);
  E.init();
  setInterval(function () {
     E.tick(1000.0 / E.SERVER_FRAME, E.serverUpdate, E.handleClientMessage, E.broadcastState);
     E.processSend(); 
  }, 1000.0 / E.SERVER_FRAME);
}

var tsMap = {};
var ctrMap = {};
function calcAvgCtr(id) {
  var nowTs = +new Date();
  if (!(id in tsMap)) {
    tsMap[id] = nowTs;
  }

  var previousSecond = Math.floor(tsMap[id] / 1000);
  var nowSecond = Math.floor(nowTs / 1000);

  if (nowSecond == previousSecond) {
    if (!(id in ctrMap)) {
      ctrMap[id] = 0;
    }
    ctrMap[id]++;
  } else {
    console.log(id, previousSecond, ctrMap[id]);
    ctrMap[id] = 1;
  }

  tsMap[id] = nowTs;
}

function init() {
  initGame();
  // 网络
  var io = require('socket.io')(8081);
  io.on('connection', (socket) => {
    var id = socket.request.connection.remoteAddress;
    E.spawnPlayer(id, socket);
    socket.on('opcode', (msg) => {
      if (msg.opcode == E.types.opcode.move) {
        calcAvgCtr(id);
      }
      E.recvMessage(id, msg);
    });
    socket.on('disconnect', (reason) => {
      E.disconnectPlayer(id);
    })
  });
}

init();
