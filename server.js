var E = require('./shared.js');

// =============================================================================
//  服务端
// =============================================================================
function initGame() {
  E.prepID(E.MAX_ID);
  E.init();
  var delta = 1000.0 / E.SERVER_FRAME;
  setInterval(function () {
     E.serverUpdate(delta);
     E.update(delta);
  }, delta);
}

function init() {
  initGame();
  // 网络
  var io = require('socket.io')(process.env.PORT, {
    cors: {
      origin: 'http://' + URL,
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
