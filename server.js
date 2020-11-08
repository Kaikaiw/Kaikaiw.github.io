// =============================================================================
//  类型
// =============================================================================
var types = {
  // 实体
  entity: {
    player:            1,
    player_tmp:        2,
    bomb:              3,
    wave:              4,
    block:             5,
    box:               6,
    loot:              7,
    player_downed:     8
  },
  // 方向
  dir: {
    up:                0,
    right:             1,
    down:              2,
    left:              3
  },
  // 键
  key: {
    up:               73,
    right:            76,
    down:             75,
    left:             74,
    space:            32
  },
  // 声
  sound: {
    bgm:               0,
    put_bomb:          1,
    explode:           2,
    pickup_loot:       3
  },
  // 加强
  loot: {
    speed:             0,
    power:             1,
    bombs:             2
  },
  // 操作代码
  opcode: {
    key_down:          0,
    key_up:            1,
    put_bomb:          2,
    chain_bomb:        3,
    explode:           4,
    wave:              5,
    delete_box:        7,
    loot:              8,
    delete_loot:       9,
    apply_loot:       10,
    offline:          11,
    new_player:       12,
    new_player_local: 13,
    move:             14,
    player_downed:    15
  }
};

// =============================================================================
//  循环队列
// =============================================================================
class Queue {
  constructor(size) {
    this.size = size + 1;
    this.data = [this.size];
    this.queueL = 0;
    this.queueR = 0;
  }

  empty() {
    return this.queueL == this.queueR;
  }

  full() {
    return (this.queueR + 1) % this.size == this.queueL;
  }

  pop() {
    var d = this.data[this.queueL];
    this.queueL = (this.queueL + 1) % this.size;
    return d;
  }

  put(d) {
    this.data[this.queueR] = d;
    this.queueR = (this.queueR + 1) % this.size;
  }
}

// =============================================================================
//  全局配置 / 坐标转换
// =============================================================================
var INFINITE = Number.MAX_VALUE;
var MAX_ID = 131072;
var MAX_QUEUE = 128;
var MAX_ROW;
var MAX_COL;
var UNIT_WIDTH;
var UNIT_HEIGHT;

function bind(rowId, colId) {
  return rowId >= 0 && rowId < MAX_ROW && colId >= 0 && colId < MAX_COL;
}

// 转换垂直坐标到2d矩阵行
function getRowID(vertical) {
  return Math.floor((vertical + UNIT_HEIGHT / 2) / UNIT_HEIGHT);
}

// 转换水平坐标到2d矩阵列
function getColID(horizontal) {
  return Math.floor((horizontal + UNIT_WIDTH / 2) / UNIT_WIDTH);
}

// =============================================================================
//  实体核心
// =============================================================================
class EntityState {
  constructor(id, x, y) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.rowId = getRowID(y);
    this.colId = getColID(x);
    this.dir = 0;
  }
}
var boxes = {};

// =============================================================================
//  玩家核心
// =============================================================================
class PlayerState extends EntityState {
  constructor(id, x, y){
    super(id, x, y);
    this.downed = false;
    this.speed = 0;
  }

  downPlayer() {
    this.downed = true;
    this.speed = 0.01;
  }

  move(delta, dir) {
    this.dir = dir;
    var toX = this.x;
    var toY = this.y;

    switch(dir) {
    case types.dir.up:
      toY = Math.max(0, this.y - this.speed * delta);
      break;
    case types.dir.right:
      toX = Math.min(WIDTH - this.sizeX, this.x + this.speed * delta);
      break;
    case types.dir.down:
      toY = Math.min(HEIGHT - this.sizeY, this.y + this.speed * delta);
      break;
    case types.dir.left:
      toX = Math.max(0, this.x - this.speed * delta);
      break;
    }

    var toColId = getColID(toX);
    var toRowId = getRowID(toY);
    if ((toRowId != this.rowId || toColId != this.colId) &&
        (bombMatrix[toRowId][toColId] || boxMatrix[toRowId][toColId])) {
      return;
    }

    this.x = toX;
    this.y = toY;
    this.rowId = toRowId;
    this.colId = toColId;
  }

  applyInput(input) {
    var key = input.key;
    var delta = input.delta;

    switch (key) {
    case types.key.up:
      this.move(delta, types.dir.up);
      break;
    case types.key.right:
      this.move(delta, types.dir.right);
      break;
    case types.key.down:
      this.move(delta, types.dir.down);
      break;
    case types.key.left:
      this.move(delta, types.dir.left);
      break;
    }
  }
}
var players = {};

// // =============================================================================
// //  炸弹核心
// // =============================================================================
// class BombState extends EntityState {
//   constructor(id, x, y, power) {
//     super(id, x, y);
//     this.chain = [];
//     this.power = power;
//   }
//
//   blocked(rowId, colId) {
//     return bind(rowId, colId) && boxMatrix[rowId][colId];
//   }
//
//   doBomb() {
//     bombMatrix[this.rowId][this.colId] = 0;
//     delete bombs[this.id];
//     // [行, 列, 下一位置, 最大位置, 方向]
//     var waveToGenerate = [
//       [this.rowId, this.colId, 0, 0, 0],
//       [this.rowId - 1, this.colId, this.rowId - 1,
//        this.rowId - this.power,
//        TYPES.DIRECTION.UP],
//       [this.rowId, this.colId + 1, this.colId + 1,
//        this.colId + this.power,
//        TYPES.DIRECTION.RIGHT],
//       [this.rowId + 1, this.colId, this.rowId + 1,
//        this.rowId + this.power,
//        TYPES.DIRECTION.DOWN],
//       [this.rowId, this.colId - 1, this.colId - 1,
//        this.colId - this.power,
//        TYPES.DIRECTION.LEFT]
//     ];
//
//     for (i in waveToGenerate) {
//       var rowId = waveToGenerate[i][0];
//       var colId = waveToGenerate[i][1];
//       var nextRowOrColId = waveToGenerate[i][2];
//       var maxRowOrColId = waveToGenerate[i][3];
//       var dir = waveToGenerate[i][4];
//       if (bind(rowId, colId)) {
//         var id = IDPool.getID();
//         waves[id] = new WaveState(
//             id, rowId, colId, dir, nextRowOrColId, maxRowOrColId);
//       }
//     }
//   }
//
//   // 链爆
//   chainBomb(currentBomb) {
//     bombVisited[currentBomb.id] = 1;
//     currentBomb.doBomb();
//     for (bomb in currentBomb.chain) {
//       if (bombVisited[currentBomb.chain[bomb]]) {
//         continue;
//       }
//       bombVisited[cb.chain[b]] = 1;
//       this.chainBomb(bombs[cb.chain[b]]);
//     }
//   }
//
//   tryChain(rowId, colId) {
//     if (bind(rowId, colId) && bombMatrix[rowId][colId]) {
//       bombs[this.id].chain.push(bombMatrix[rowId][colId]);
//       bombs[bombMatrix[rowId][colId]].chain.push(this.id);
//     }
//   }
//
//   // 放置炸弹时, 尝试链接其他炸弹, 达到链爆效果
//   doChain() {
//     // 向下链接
//     for (i = this.rowId + 1;
//          bind(i, this.colId) &&
//          !this.blocked(i, this.colId) && i <= this.rowId + this.power; i++) {
//       tryChain(i, this.colId);
//     }
//     // 向上链接
//     for (i = this.rowId - 1;
//          bind(i, this.colId) &&
//          !this.blocked(i, this.colId) && i >= this.rowId - this.power; i--) {
//       tryChain(i, this.colId);
//     }
//     // 向右链接
//     for (j = this.colId + 1;
//          bind(this.rowId, j) &&
//          !this.blocked(this.rowId, j) && j <= this.colId + this.power; j++) {
//       tryChain(this.rowId, j);
//     }
//     // 向左链接
//     for (j = this.colId - 1;
//          bind(this.rowId, j) &&
//          !this.blocked(this.rowId, j) && j >= this.colId - this.power; j--) {
//       tryChain(this.rowId, j);
//     }
//   }
// }
var bombs = {};
// var bombVisit = {};
// var bombMatrix;
//
// // =============================================================================
// //  爆波
// // =============================================================================
// class WaveState extends EntityState {
//   constructor(id, x, y, dir, nextRowOrColId, maxRowOrColId) {
//     super(id, y * UNIT_WIDTH, x * UNIT_HEIGHT);
//     this.dir = dir;
//     this.nextRowOrColId = nextRowOrColId;
//     this.maxRowOrColId = maxRowOrColId;
//     this.spreadTime = 17;
//     this.rowId = x;
//     this.colId = y;
//
//     if (boxMatrix[this.rowId][this.colId]) {
//       this.nextRowOrColId = this.maxRowOrColId;
//     }
//   }
// }
var waves = {};


// =============================================================================
//  网络
// =============================================================================
var msgQueue = new Queue(MAX_QUEUE);
var sendQueue = new Queue(MAX_QUEUE);
var oldNetTs = 0;

// =============================================================================
//  UTIL
// =============================================================================
var GAME_LOOP = null; // 主循环
var FRAME_RATE = 0;
var oldTs = 0;

var IDPool = {};
IDPool.idQueue = new Queue(MAX_ID);

IDPool.prepID = function() {
  for (i = 0; i < MAX_ID; i++) {
    IDPool.idQueue.put(i);
  }
}

IDPool.getID = function() {
  return IDPool.idQueue.pop();
}

IDPool.releaseID = function(id) {
  IDPool.idQueue.put(id);
}

// =============================================================================
//  服务端
// =============================================================================
var MAX_PLAYERS = 4;
var numPlayers = 0;

// 硬编码地图
var map = [
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

var playerSpawns = [
  [0, 0],
  [UNIT_WIDTH * (MAX_COL - 1), 0],
  [0, UNIT_HEIGHT * (MAX_ROW - 1)],
  [UNIT_WIDTH * (MAX_COL - 1), UNIT_HEIGHT * (MAX_ROW - 1)]
];

function initGame() {
  MAX_ROW = 16;
  MAX_COL = 16;
  UNIT_WIDTH = 50;
  UNIT_HEIGHT = 50;

  IDPool.prepID();

  for (i = 0; i < MAX_ROW; i++) {
    for (j = 0; j < MAX_COL; j++) {
      if (map[i][j] == 1) {
        var id = IDPool.getID();
        boxes[id] = new EntityState(id, i * UNIT_WIDTH, j * UNIT_HEIGHT);
      }
    }
  }

  FRAME_RATE = 20;
  GAME_LOOP = setInterval(tick, 1000.0 / FRAME_RATE);
}

function tick() {
  var nowTs = +new Date();
  var oldTs_ = oldTs || nowTs;
  var delta = nowTs - oldTs_;
  oldTs = nowTs;
  update(delta);
}

function update(delta) {
  // 接收网络消息
  if (!msgQueue.empty()) {
    handleMessage(msgQueue.pop());
  }

  // 发送网络消息, Lockstep = 20FPS
  if (!sendQueue.empty() && delta >= 50) {
    socket.emit('opcode', {data: sendQueue.pop()});
  }
}

function sendGameData(socket) {
  socket.emit('stream', {
      maxRow: MAX_ROW,
      maxCol: MAX_COL,
      unitWidth: UNIT_WIDTH,
      unitHeight: UNIT_HEIGHT,
      boxes: boxes
  });
}

function init() {
  initGame();
  // 网络
  var io = require('socket.io')(8081);
  io.on('connection', (socket) => {
    socket.on('stream', () => {
      sendGameData(socket);
    });
    socket.on('opcode', (msg) => {
      handleMessage(msg);
    });
    socket.on('disconnect', () => {});

    var id = socket.handshake.address;
    if (id in players) {
      return;
    }

    if (numPlayers < MAX_PLAYERS) {
      var spawnX = playerSpawns[numPlayers][0];
      var spawnY = playerSpawns[numPlayers][1];
      players[id] = new PlayerState(id, spawnX, spawnY);
      numPlayers++;
    }
  });
}

init();
