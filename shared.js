var E;
if (typeof exports === 'undefined') {
  E = {};
} else {
  E = exports;
}

// =============================================================================
//  类型
// =============================================================================
types = {
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
    explode:           4,
    wave:              5,
    delete_box:        7,
    loot:              8,
    delete_loot:       9,
    apply_loot:       10,
    new_player:       12,
    new_player_local: 13,
    move:             14,
    bomb:             15,
    box:              16,
  }
};

// =============================================================================
//  全局配置 / 坐标转换
// =============================================================================
SERVER_FRAME = 10;
INFINITE = Number.MAX_VALUE;
MAX_ID = 131072;
MAX_ROW = 16;
MAX_COL = 16;
UNIT_WIDTH = 50;
UNIT_HEIGHT = 50;
WIDTH = UNIT_WIDTH * MAX_COL;
HEIGHT = UNIT_HEIGHT * MAX_ROW;
MAX_PLAYERS = 4;
numPlayers = 0;

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
  constructor(id, x, y, sizeX, sizeY) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.sizeX = sizeX;
    this.sizeY = sizeY;
    this.rowId = getRowID(y);
    this.colId = getColID(x);
    this.dir = 0;
  }

  update(delta) {
    // pass...
  }
}
class BoxState extends EntityState {
  constructor(id, x, y) {
    super(id, x, y);
    boxMatrix[this.rowId][this.colId] = this.id;
  }

  destroyBox() {
    if (!(this.id in toDestroyBoxes)) {
      toDestroyBoxes[this.id] = this;
    }
  }
}
boxes = {};
toDestroyBoxes = {}
var boxMatrix;

// =============================================================================
//  玩家核心
// =============================================================================
class PlayerState extends EntityState {
  constructor(id, x, y, sizeX, sizeY){
    super(id, x, y, sizeX, sizeY);
    this.downed = false;
    this.speed = 0.20;
    this.power = 3;
    this.currentBombNumber = 0;
    this.maxBombNumber = 1;
    this.buffer = [];  // 插值玩家状态
    this.ackSeqId = 0; // 重建序列ID
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
      toX = Math.min(WIDTH - this.sizeX / 2, this.x + this.speed * delta);
      break;
    case types.dir.down:
      toY = Math.min(HEIGHT - this.sizeY / 3, this.y + this.speed * delta);
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

  putBomb() {
    if (bombMatrix[this.rowId][this.colId] || boxMatrix[this.rowId][this.colId]) {
      return;
    }

    if (this.currentBombNumber >= this.maxBombNumber) {
      return;
    }

    var id = getID();
    var bomb = new BombState(id, this.x, this.y, this.power);
    bombs[id] = bomb;
    bomb.doChain();
  }

  update(delta) {
    var renderTs = +new Date() - 1000.0 / SERVER_FRAME;

    while (this.buffer.length >= 2 && this.buffer[1].ts <= renderTs) {
      this.buffer.shift();
    }

    if (this.buffer.length >= 2 &&
        this.buffer[0].ts <= renderTs &&
        renderTs <= this.buffer[1].ts) {
      var x0 = this.buffer[0].x;
      var x1 = this.buffer[1].x;
      var y0 = this.buffer[0].y;
      var y1 = this.buffer[1].y;
      var t0 = this.buffer[0].ts;
      var t1 = this.buffer[1].ts;

      this.x = x0 + (x1 - x0) * (renderTs - t0) / (t1 - t0);
      this.y = y0 + (y1 - y0) * (renderTs - t0) / (t1 - t0);
    }
  }

  applyInput(input) {
    var key = input.key;
    var delta = input.delta;

    if (delta > 50) { // Anti-cheat
      return;
    }

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
players = {};

// =============================================================================
//  炸弹核心
// =============================================================================
class BombState extends EntityState {
  constructor(id, x, y, power) {
    super(id, x, y);
    this.chain = [];
    this.power = power;
    this.putTime = +new Date();
    this.ttl = 3000; // 3秒
    bombMatrix[this.rowId][this.colId] = id;
  }

  blocked(rowId, colId) {
    return bind(rowId, colId) && boxMatrix[rowId][colId];
  }

  doBomb() {
    bombMatrix[this.rowId][this.colId] = 0;
    delete bombs[this.id];

    // 中
    var id = getID();
    waves[id] = new WaveState(id, this.rowId, this.colId, types.dir.up);

    var r = 0;
    var c = 0;

    // 上
    for (r = this.rowId - 1; r >= this.rowId - this.power; r--) {
      if (!bind(r, this.colId)) {
        break;
      }
      if (boxMatrix[r][this.colId]) {
        var id = boxMatrix[r][this.colId];
        boxes[id].destroyBox();
        break;
      }
      var id = getID();
      waves[id] = new WaveState(id, r, this.colId, types.dir.up);
    }
    // 下
    for (r = this.rowId + 1; r <= this.rowId + this.power; r++) {
      if (!bind(r, this.colId)) {
        break;
      }
      if (boxMatrix[r][this.colId]) {
        var id = boxMatrix[r][this.colId];
        boxes[id].destroyBox();
        break;
      }
      var id = getID();
      waves[id] = new WaveState(id, r, this.colId, types.dir.down);
    }
    // 左
    for (c = this.colId - 1; c >= this.colId - this.power; c--) {
      if (!bind(this.rowId, c)) {
        break;
      }
      if (boxMatrix[this.rowId][c]) {
        var id = boxMatrix[this.rowId][c];
        boxes[id].destroyBox();
        break;
      }
      var id = getID();
      waves[id] = new WaveState(id, this.rowId, c, types.dir.left);
    }
    // 右
    for (c = this.colId + 1; c <= this.colId + this.power; c++) {
      if (!bind(this.rowId, c)) {
        break;
      }
      if (boxMatrix[this.rowId][c]) {
        var id = boxMatrix[this.rowId][c];
        boxes[id].destroyBox();
        break;
      }
      var id = getID();
      waves[id] = new WaveState(id, this.rowId, c, types.dir.right);
    }
  }

  // 链爆
  chainBomb(currentBomb) {
    bombsVisited[currentBomb.id] = 1;
    currentBomb.doBomb();
    for (i in currentBomb.chain) {
      if (bombsVisited[currentBomb.chain[i]]) {
        continue;
      }
      bombsVisited[currentBomb.chain[i]] = 1;
      this.chainBomb(bombs[currentBomb.chain[i]]);
    }
  }

  tryChain(rowId, colId) {
    var otherId = bombMatrix[rowId][colId];
    if (bind(rowId, colId) && otherId) {
      bombs[this.id].chain.push(otherId);
      bombs[otherId].chain.push(this.id);
    }
  }

  // 放置炸弹时, 尝试链接其他炸弹, 达到链爆效果
  doChain() {
    // 向下链接
    for (i = this.rowId + 1;
        bind(i, this.colId) &&
        !this.blocked(i, this.colId) && i <= this.rowId + this.power; i++) {
      this.tryChain(i, this.colId);
    }
    // 向上链接
    for (i = this.rowId - 1;
        bind(i, this.colId) &&
        !this.blocked(i, this.colId) && i >= this.rowId - this.power; i--) {
      this.tryChain(i, this.colId);
    }
    // 向右链接
    for (j = this.colId + 1;
        bind(this.rowId, j) &&
        !this.blocked(this.rowId, j) && j <= this.colId + this.power; j++) {
      this.tryChain(this.rowId, j);
    }
    // 向左链接
    for (j = this.colId - 1;
        bind(this.rowId, j) &&
        !this.blocked(this.rowId, j) && j >= this.colId - this.power; j--) {
      this.tryChain(this.rowId, j);
    }
  }

  update(delta) {
    var nowTs = +new Date();
    if (nowTs - this.putTime >= this.ttl) {
      bombsVisited = {};
      this.chainBomb(this);
    }
  }
}
bombs = {};
bombsVisited = {};
var bombMatrix;

// =============================================================================
//  爆波
// =============================================================================
class WaveState extends EntityState {
  constructor(id, rowId, colId, dir) {
    super(id, colId * UNIT_WIDTH, rowId * UNIT_HEIGHT);
    this.dir = dir;
    this.rowId = rowId;
    this.colId = colId;
    this.createTime = +new Date();
    this.ttl = 400 // 1秒
  }

  update(delta) {
    var nowTs = +new Date();
    if (this.createTime + this.ttl < nowTs) {
      delete waves[this.id];
      return;
    }
  }
}
waves = {};


// =============================================================================
//  网络
// =============================================================================
msgQueue = [];
sendQueue = [];
clients = {};

function sendMessage(msg) {
  sendQueue.push(msg);
}

function recvMessage(id, msg) {
  msgQueue.push({'id': id, 'msg': msg});
}

// =============================================================================
//  UTIL
// =============================================================================
oldTs = 0;
idQueue = [];

function prepID() {
  for (i = 0; i < MAX_ID; i++) {
    idQueue.push(i);
  }
}
function getID() {
  return idQueue.shift();
}
function releaseID(id) {
  idQueue.push(id);
}

function init(map) {
  // 箱子
  boxMatrix = new Array(MAX_ROW);
  for (i = 0; i < MAX_ROW; i++) {
    boxMatrix[i] = new Array(MAX_COL);
  }

  // 炸弹
  bombMatrix = new Array(MAX_ROW);
  for (i = 0; i < MAX_ROW; i++) {
    bombMatrix[i] = new Array(MAX_COL);
  }

  for (i = 0; i < MAX_ROW; i++) {
    for (j = 0; j < MAX_COL; j++) {
      if (map[i][j] == 1) {
        var id = getID();
        boxes[id] = new BoxState(id, j * UNIT_WIDTH, i * UNIT_HEIGHT);
        boxMatrix[i][j] = id;
      } else {
        boxMatrix[i][j] = 0;
      }
    }
  }
}

function handleClientMessage(data) {
  var id = data.id;
  var msg = data.msg;

  switch (msg.opcode) {
  case types.opcode.move:
    var player = players[id];
    player.applyInput(msg.input);
    player.ackSeqId = msg.input.seqId;
  break;
  case types.opcode.put_bomb:
    players[id].putBomb();
  break;
  }
}

function broadcastState() {
  for (id in players) {
    for (otherId in players) {
      let player = players[otherId];
      sendMessage({
        'to': id,
        'data': {
          'opcode': types.opcode.move,
          'id': otherId,
          'ackSeqId': player.ackSeqId,
          'x': player.x,
          'y': player.y,
          'dir': player.dir,
        }
      });
    }

    sendMessage({
      'to': id,
      'data': {
        'opcode': types.opcode.bomb,
        'bombs': bombs,
      }
    });

    sendMessage({
      'to': id,
      'data': {
        'opcode': types.opcode.wave,
        'waves': waves,
      }
    });

    sendMessage({
      'to': id,
      'data': {
        'opcode': types.opcode.box,
        'boxes': boxes,
      }
    });
  }
}

function update(delta, callback, broadcast) {
  // 接收网络消息
  while (msgQueue.length > 0) {
    callback(msgQueue.shift()); // handleClientMessage
  }

  // 更新玩家
  for (i in players) { players[i].update(delta); }
  // 更新其他
  for (i in waves) { waves[i].update(delta); }
  for (i in bombs) { bombs[i].update(delta); }

  for (id in toDestroyBoxes) {
    boxMatrix[boxes[id].rowId][boxes[id].colId] = 0;
    delete boxes[id];
  }
  toDestroyBoxes = {};

  broadcast();
}

function processSend() {
  while (sendQueue.length > 0) {
    var msg = sendQueue.shift();
    clients[msg.to].emit('opcode', msg.data);
  }
}

function tick(callback, broadcast) {
  var nowTs = +new Date();
  var oldTs_ = oldTs || nowTs;
  var delta = nowTs - oldTs_;
  oldTs = nowTs;
  update(delta, callback, broadcast);

  return delta;
}

function sendGameData(socket) {
  socket.emit('stream', {
      boxes: boxes,
      players: players,
  });
}

playerSpawns = [
  [0, UNIT_HEIGHT * (MAX_ROW - 1)],
  [0, 0],
  [UNIT_WIDTH * (MAX_COL - 1), 0],
  [UNIT_WIDTH * (MAX_COL - 1), UNIT_HEIGHT * (MAX_ROW - 1)]
];

function spawnPlayer(id, socket) {
  clients[id] = socket;

  if (!(id in players) && numPlayers < MAX_PLAYERS) {
    var spawnX = playerSpawns[numPlayers][0];
    var spawnY = playerSpawns[numPlayers][1];
    var player = new PlayerState(id, spawnX, spawnY, 96, 118);
    numPlayers++;
    players[id] = player;
  }


  // 广播新玩家状态
  for (otherId in players) {
    if (otherId == id) {
      continue;
    }

    sendMessage({
      'to': otherId,
      'data': {
        'opcode': types.opcode.new_player,
        'player': players[id],
      }
    });
  }

  sendMessage({
    'to': id,
    'data': {
      'opcode': types.opcode.new_player_local,
      'player': players[id],
    }
  });
}

// =============================================================================
//  SERVER EXPORTS
// =============================================================================
E.types = types;
E.INFINITE = INFINITE;
E.MAX_ID = MAX_ID;
E.MAX_ROW = MAX_ROW;
E.MAX_COL = MAX_COL;
E.WIDTH = WIDTH;
E.HEIGHT = HEIGHT;
E.UNIT_WIDTH = UNIT_WIDTH;
E.UNIT_HEIGHT = UNIT_HEIGHT;
E.prepID = prepID;
E.getID = getID;
E.releaseID = releaseID;
E.init = init;
E.update = update;
E.tick = tick;
E.sendGameData = sendGameData;
E.spawnPlayer = spawnPlayer;
E.sendMessage = sendMessage;
E.recvMessage = recvMessage;
E.processSend = processSend;
E.handleClientMessage = handleClientMessage;
E.broadcastState = broadcastState;
E.SERVER_FRAME = SERVER_FRAME;