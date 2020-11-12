var E = require('./shared.js');

// =============================================================================
//  服务端
// =============================================================================
function initGame() {
  E.init();
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
