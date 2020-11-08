let shared = require('./shared.js')

// =============================================================================
//  服务端
// =============================================================================
let MAX_PLAYERS = 4;
let numPlayers = 0;

// 硬编码地图
let map = [
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

let playerSpawns = [
  [0, 0],
  [shared.UNIT_WIDTH * (shared.MAX_COL - 1), 0],
  [0, shared.UNIT_HEIGHT * (shared.MAX_ROW - 1)],
  [shared.UNIT_WIDTH * (shared.MAX_COL - 1), shared.UNIT_HEIGHT * (shared.MAX_ROW - 1)]
];

function initGame() {
  shared.MAX_ROW = 16;
  shared.MAX_COL = 16;
  shared.UNIT_WIDTH = 50;
  shared.UNIT_HEIGHT = 50;

  IDPool.prepID();

  for (i = 0; i < shared.MAX_ROW; i++) {
    for (j = 0; j < shared.MAX_COL; j++) {
      if (map[i][j] == 1) {
        let id = IDPool.getID();
        shared.boxes[id] = new shared.EntityState(id, i * shared.UNIT_WIDTH, j * shared.UNIT_HEIGHT);
      }
    }
  }

  shared.FRAME_RATE = 20;
  shared.GAME_LOOP = setInterval(tick, 1000.0 / shared.FRAME_RATE);
}

function tick() {
  let nowTs = +new Date();
  let oldTs_ = shared.oldTs || nowTs;
  let delta = nowTs - oldTs_;
  shared.oldTs = nowTs;
  update(delta);
}

function update(delta) {
  // 接收网络消息
  if (!shared.msgQueue.empty()) {
    handleMessage(shared.msgQueue.pop());
  }

  // 发送网络消息, Lockstep = 20FPS
  if (!shared.sendQueue.empty() && delta >= 50) {
    socket.emit('opcode', {data: shared.sendQueue.pop()});
  }
}

function sendGameData(socket) {
  socket.emit('stream', {
      maxRow: shared.MAX_ROW,
      maxCol: shared.MAX_COL,
      unitWidth: shared.UNIT_WIDTH,
      unitHeight: shared.UNIT_HEIGHT,
      boxes: shared.boxes
  });
}

function init() {
  initGame();
  // 网络
  let io = require('socket.io')(8081);
  io.on('connection', (socket) => {
    socket.on('stream', () => {
      sendGameData(socket);
    });
    socket.on('opcode', (msg) => {
      handleMessage(msg);
    });
    socket.on('disconnect', () => {});

    let id = socket.handshake.address;
    if (id in shared.players) {
      return;
    }

    console.log(id);

    if (numPlayers < MAX_PLAYERS) {
      let spawnX = playerSpawns[numPlayers][0];
      let spawnY = playerSpawns[numPlayers][1];
      shared.players[id] = new shared.PlayerState(id, spawnX, spawnY);
      numPlayers++;
    }
  });
}

init();
