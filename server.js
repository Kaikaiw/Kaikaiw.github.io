var E = require('./shared.js');

// =============================================================================
//  服务端
// =============================================================================
function initGame() {
  E.prepID(E.MAX_ID);
  E.init(0);
  setInterval(function () {
     E.tick(1000.0 / E.SERVER_FRAME, E.serverUpdate, E.handleClientMessage);
  }, 1000.0 / E.SERVER_FRAME);
}

function init() {
  initGame();
  // 网络
  var io = require('socket.io')(8081, {
    cors: {
      origin: 'http://' + URL + '8000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });
  io.on('connection', (socket) => {
    var id = socket.request.connection.remoteAddress;
    E.spawnPlayer(id, socket);
    socket.on('opcode', (msg) => {
      E.recvMessage(id, msg);
    });
    socket.on('disconnect', (reason) => {
      E.disconnectPlayer(id);
    })
  });
}

init();
