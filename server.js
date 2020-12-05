var E = require('./shared.js');

// =============================================================================
//  服务端
// =============================================================================
function initGame() {
  E.prepID(MAX_ID);
  E.init();
  var delta = 1000 / SERVER_FRAME;
  var loop = function () {
    setTimeout(loop, delta);
    E.serverUpdate(delta);
    E.update(delta);
  };
  setTimeout(loop, delta);
}

function init() {
  initGame();
  // 网络
  var io = require('socket.io')(process.env.PORT, {
    cors: {
      origin: URL,
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
