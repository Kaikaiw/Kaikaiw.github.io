var E = require('./shared.js');

// =============================================================================
//  服务端
// =============================================================================
// 硬编码地图
map = [
  [0,0,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,0,0]
]

function initGame() {
  E.init(map);

  setInterval(function () {
     E.tick(1000.0 / E.SERVER_FRAME, E.serverUpdate, E.handleClientMessage, E.broadcastState);
     E.processSend(); 
  }, 1000.0 / E.SERVER_FRAME);
}

function init() {
  initGame();
  // 网络
  var io = require('socket.io')(8081);
  io.on('connection', (socket) => {
    var id = socket.request.connection.remoteAddress;
    E.spawnPlayer(id, socket);
    socket.on('opcode', (msg) => {
      E.recvMessage(id, msg);
    });
  });
}

init();
