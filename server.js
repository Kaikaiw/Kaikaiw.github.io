var E = require('./shared.js');

// =============================================================================
//  服务端
// =============================================================================
// 硬编码地图
map = [
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0]
]

function initGame() {
  E.prepID();
  E.init(map);

  setInterval(function () {
     E.tick(E.handleClientMessage);
     E.processSend(); 
  }, 1000.0 / 10); // 10FPS 游戏循环
}

function init() {
  initGame();
  // 网络
  var io = require('socket.io')(8081);
  io.on('connection', (socket) => {
    socket.on('stream', () => {
      E.sendGameData(socket);

      var id = socket.handshake.address;
      E.spawnPlayer(id, socket);
    });
    socket.on('opcode', (msg) => {
      E.recvMessage(msg);
    });
    socket.on('disconnect', () => {
      E.despawnPlayer(socket.handshake.address);
    });
  });
}

init();
