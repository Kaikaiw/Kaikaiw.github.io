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
    player:            0,
    player2:           1,
    player3:           2,
    player4:           3,
    bomb:              4,
    wave:              5,
    block:             6,
    box:               7,
    loot:              8,
    player_downed:     9,
    stone:            10 
  },
  // 方向
  dir: {
    up:                1,
    right:             2,
    down:              3,
    left:              4
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
    ship:              0,
    put_bomb:          1,
    explode:           2,
    pickup_loot:       3,
    resident:          4,
    x:                 5
  },
  // 加强
  loot: {
    speed:             1,
    power:             2,
    bombs:             3
  },
  // 操作代码
  opcode: {
    put_bomb:          2,
    explode:           4,
    pickup_loot:       9,
    move:             14,
    new_player:       17,
    new_map:          18,
  }
};

// =============================================================================
//  全局配置 / 坐标转换
// =============================================================================
URL = '0.0.0.0:';
FRAME_RATE = 50;
SERVER_FRAME = 10;
INFINITE = Number.MAX_VALUE;
MAX_ID = 131071;
MAX_QUEUE_SIZE = 1023;
MAX_ROW = 13;
MAX_COL = 15;
UNIT_WIDTH = 64;
UNIT_HEIGHT = 64;
WIDTH = UNIT_WIDTH * MAX_COL;
HEIGHT = UNIT_HEIGHT * MAX_ROW;
MAX_PLAYERS = 4;
numPlayers = 0;
// 硬编码地图
maps = [
  [
    [0,0,1,1,0,0,0,1,0,0,0,1,1,0,0],
    [0,2,1,0,1,1,1,0,1,1,1,0,1,2,0],
    [1,1,0,1,0,1,0,1,0,1,0,1,0,1,1],
    [1,0,1,0,1,1,1,1,1,1,1,0,1,0,1],
    [1,0,1,1,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,1,0,1,1,1,1,1,1,1,0,1,0,1],
    [1,0,1,1,1,1,2,2,2,1,1,1,1,0,1],
    [1,1,0,1,0,1,1,1,1,1,0,1,0,1,1],
    [1,1,1,0,1,1,1,1,1,1,1,0,1,1,1],
    [1,1,1,1,0,1,0,1,0,1,0,1,1,1,1],
    [1,1,0,1,1,0,1,1,1,0,1,1,0,1,1],
    [1,2,0,1,1,1,0,0,0,1,1,1,0,2,1],
    [0,0,0,1,1,1,1,1,1,1,1,1,0,0,0],
  ],
  [
    [0,0,1,1,1,1,0,0,0,1,1,1,1,0,0],
    [0,2,1,2,1,2,0,2,0,2,1,2,1,2,0],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,2,1,2,1,2,1,2,1,2,1,2,1,2,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [0,2,1,2,1,2,1,2,1,2,1,2,1,2,0],
    [0,0,1,1,1,1,1,1,1,1,1,1,1,0,0],
    [0,2,1,2,1,2,1,2,1,2,1,2,1,2,0],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,2,1,2,1,2,1,2,1,2,1,2,1,2,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [0,2,1,2,1,2,0,2,0,2,1,2,1,2,0],
    [0,0,1,1,1,1,0,0,0,1,1,1,1,0,0],
  ],
  [
    [0,1,1,1,1,0,0,0,1,0,2,1,2,0,2],
    [0,2,1,2,1,2,1,0,0,2,1,1,0,0,0],
    [0,0,1,1,1,0,0,1,1,0,2,1,2,1,2],
    [1,2,1,2,1,2,1,0,0,2,1,1,1,1,1],
    [1,1,1,1,1,0,0,0,1,0,2,1,2,1,2],
    [1,2,1,2,1,2,1,1,0,0,1,1,1,1,1],
    [2,0,2,0,2,0,0,0,1,0,2,0,2,0,2],
    [1,1,1,1,1,0,1,0,0,2,1,2,1,2,1],
    [2,1,2,1,2,0,0,1,1,0,1,1,1,1,1],
    [1,1,1,1,1,2,1,0,0,2,1,2,1,2,1],
    [2,0,2,1,2,0,0,0,1,0,1,1,1,1,0],
    [0,0,1,1,1,2,1,1,0,2,1,2,1,2,0],
    [2,0,2,1,2,0,0,0,1,0,1,1,1,0,0],
  ],
]

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
// 删除
function remove(dict, id, matrix) {
  if (typeof matrix != 'undefined') {
    matrix[dict[id].rowId][dict[id].colId] = 0;
  }
  delete dict[id];
  releaseID(id);
}
function clientRemove(dict, id, matrix) {
  if (typeof matrix != 'undefined') {
    matrix[dict[id].state.rowId][dict[id].state.colId] = 0;
  }
  delete dict[id];
}

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

  shift() {
    var d = this.data[this.queueL];
    this.queueL = (this.queueL + 1) % this.size;
    return d;
  }

  push(d) {
    if (this.full()) {
      return;
    }
    this.data[this.queueR] = d;
    this.queueR = (this.queueR + 1) % this.size;
  }

  peek() {
    return this.data[this.queueL];
  }

  peekSecond() {
    return this.data[(this.queueL + 1) % this.size];
  }

  length() {
    if (this.queueL <= this.queueR) {
      return this.queueR - this.queueL;
    } else {
      return this.size - this.queueL + this.queueR;
    }
  }

  iterate(callback) {
    var i = this.queueL;
    while (i != this.queueR) {
      callback(this.data[i]);
      i = (i + 1) % this.size;
    }
  }
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

// =============================================================================
//  箱子
// =============================================================================
class BoxState extends EntityState {
  constructor(id, x, y) {
    super(id, x, y);
    if (x != -1) {
      boxMatrix[this.rowId][this.colId] = this.id;
    }
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
var stoneMatrix;

// =============================================================================
//  玩家核心
// =============================================================================
class PlayerState extends EntityState {
  constructor(id, x, y, sizeX, sizeY, playerNum){
    super(id, x, y, sizeX, sizeY);
    this.downed = false;
    this.downedFrame = 0;
    this.stackedSpeed = 0;
    this.speed = 15;
    this.maxSpeed = 30;
    this.power = 1;
    this.maxPower = 8;
    this.currentBombNumber = 0;
    this.maxBombNumber = 1;
    this.maxMaxBombNumber = 8;
    this.buffer = new Queue(MAX_QUEUE_SIZE); // 插值玩家状态
    this.ackSeqId = 0; // 重建序列ID
    this.score = 0;
    this.msgQueue = new Queue(50);
    this.playerNum = playerNum;
  }

  downPlayer() {
    if (!this.downed) {
      this.downed = true;
      this.downedFrame = 0;
      this.stackedSpeed = this.speed;
      this.speed = 1;
    }
  }

  revivePlayer() {
    if (this.downed) {
      this.downed = false;
      this.speed = this.stackedSpeed;
    }
  }

  pickupLoot(type) {
    switch(type) {
      case types.loot.speed:
        this.speed = Math.min(this.maxSpeed, this.speed + 2);
      break;
      case types.loot.power:
        this.power = Math.min(this.maxPower, this.power + 1);
      break;
      case types.loot.bombs:
        this.maxBombNumber = Math.min(this.maxMaxBombNumber, this.maxBombNumber + 1);
      break;
    }
  }

  move(delta, dir, isServer) {
    this.dir = dir;
    var toX = this.x;
    var toY = this.y;
    var diff = this.speed * delta / 100;

    switch(dir) {
    case types.dir.up:
      toY = Math.max(0, this.y - diff);
      break;
    case types.dir.right:
      toX = Math.min(WIDTH - this.sizeX, this.x + diff);
      break;
    case types.dir.down:
      toY = Math.min(HEIGHT - this.sizeY, this.y + diff);
      break;
    case types.dir.left:
      toX = Math.max(0, this.x - diff);
      break;
    }
    toX = Math.round(toX);
    toY = Math.round(toY);

    var toColId = getColID(toX);
    var toRowId = getRowID(toY);
    if (!bind(toRowId, toColId)) {
      return;
    }
    if ((toRowId != this.rowId || toColId != this.colId) &&
        (bombMatrix[toRowId][toColId] || boxMatrix[toRowId][toColId] || stoneMatrix[toRowId][toColId])) {
      return;
    }

    this.x = toX;
    this.y = toY;
    this.rowId = toRowId;
    this.colId = toColId;

    if (!isServer) {
      return;
    }

    if (waveMatrix[toRowId][toColId]) {
      this.downPlayer();
    } 

    for (var id in playerMatrix[this.rowId][this.colId]) {
      if (id == this.id) {
        continue;
      }
      if (id in players && players[id].downed) {
        players[id].revivePlayer();
        this.score++;
      }
    }

    var lootId = lootMatrix[this.rowId][this.colId];
    if (lootId) {
      this.pickupLoot(loots[lootId].type);
      remove(loots, lootId, lootMatrix)
      clients[this.id].volatile.emit('opcode', {o: types.opcode.pickup_loot,});
    }
  }

  putBomb() {
    if (this.downed) {
      return;
    }
    if (bombMatrix[this.rowId][this.colId] ||
      boxMatrix[this.rowId][this.colId] ||
      stoneMatrix[this.rowId][this.colId]) {
      return;
    }

    if (this.currentBombNumber >= this.maxBombNumber) {
      return;
    }
    this.currentBombNumber++;

    var id = getID();
    bombs[id] = new BombState(id, this.x, this.y, this.power, this.id);
    bombs[id].doChain();
  }

  update(delta) {
    var renderTs = +new Date() - 1000.0 / SERVER_FRAME;

    while (this.buffer.length() >= 2 && this.buffer.peekSecond().ts <= renderTs) {
      this.buffer.shift();
    }

    if (this.buffer.length() >= 2) {
      var left = this.buffer.peek();
      var right = this.buffer.peekSecond();
      if (left.ts <= renderTs && renderTs <= right.ts) {
        var x0 = left.x;
        var x1 = right.x;
        var y0 = left.y;
        var y1 = right.y;
        var t0 = left.ts;
        var t1 = right.ts;

        this.x = x0 + (x1 - x0) * (renderTs - t0) / (t1 - t0);
        this.y = y0 + (y1 - y0) * (renderTs - t0) / (t1 - t0);
        this.rowId = getRowID(this.y);
        this.colId = getColID(this.x);
      }
    }
  }

  applyInput(input, isServer) {
    this.ackSeqId = input.seqId;
    var key = input.key;
    var delta = input.delta;

    switch (key) {
    case types.key.up:
      this.move(delta, types.dir.up, isServer);
      break;
    case types.key.right:
      this.move(delta, types.dir.right, isServer);
      break;
    case types.key.down:
      this.move(delta, types.dir.down, isServer);
      break;
    case types.key.left:
      this.move(delta, types.dir.left, isServer);
      break;
    }
  }
}
players = {};
var playerMatrix;

// =============================================================================
//  炸弹核心
// =============================================================================
class BombState extends EntityState {
  constructor(id, x, y, power, owner) {
    super(id, x, y);
    this.chain = [];
    this.power = power;
    this.putTime = +new Date();
    this.ttl = 3000; // 3秒
    this.owner = owner;
    if (x != -1) {
      bombMatrix[this.rowId][this.colId] = id;
    }
  }

  blocked(rowId, colId) {
    return bind(rowId, colId) && (boxMatrix[rowId][colId] || stoneMatrix[rowId][colId]);
  }

  doBomb() {
    remove(bombs, this.id, bombMatrix);
    if (this.owner in players) {
      var player = players[this.owner];
      player.currentBombNumber--;
      if (player.currentBombNumber < 0) {
        player.currentBombNumber = 0;
      }
    }

    // 中
    var id = getID();
    waves[id] = new WaveState(id, this.rowId, this.colId, types.dir.up);
    waveMatrix[this.rowId][this.colId] = id;

    var directions = [ // [direction, start_i, start_j, end_i, end_j, step_i, step_j, dir_type]
      [0, this.rowId + 1, this.colId, this.rowId + this.power, this.colId + this.power,  1,  0, types.dir.down],
      [1, this.rowId - 1, this.colId, this.rowId - this.power, this.colId - this.power, -1,  0, types.dir.up],
      [0, this.rowId, this.colId + 1, this.rowId + this.power, this.colId + this.power,  0,  1, types.dir.right],
      [1, this.rowId, this.colId - 1, this.rowId - this.power, this.colId - this.power,  0, -1, types.dir.left],
    ];

    for (var dir = 0; dir < directions.length; dir++) {
      var d = directions[dir];
      for (var i = d[1], j = d[2]; (d[0] ? i >= d[3] && j >= d[4] : i <= d[3] && j <= d[4]);) {
        if (!bind(i, j) || stoneMatrix[i][j]) {
          break;
        }
        if (boxMatrix[i][j]) {
          var id = boxMatrix[i][j];
          boxes[id].destroyBox();
          break;
        }
        var id = getID();
        waves[id] = new WaveState(id, i, j, d[7]);
        waveMatrix[i][j] = id;
        i += d[5];
        j += d[6];
      }
    }
  }

  // 链爆
  chainBomb(currentBomb) {
    bombsVisited[currentBomb.id] = 1;
    currentBomb.doBomb();
    for (var i in currentBomb.chain) {
      if (bombsVisited[currentBomb.chain[i]]) {
        continue;
      }
      bombsVisited[currentBomb.chain[i]] = 1;
      this.chainBomb(bombs[currentBomb.chain[i]]);
    }
  }

  tryChain(rowId, colId) {
    var otherId = bombMatrix[rowId][colId];
    if (otherId && bind(rowId, colId)) {
      bombs[this.id].chain.push(otherId);
      bombs[otherId].chain.push(this.id);
      return true;
    }
    return false;
  }

  // 放置炸弹时, 尝试链接其他炸弹, 达到链爆效果
  doChain() {
    var directions = [ // [direction, start_i, start_j, end_i, end_j, step_i, step_j]
      [0, this.rowId + 1, this.colId, this.rowId + this.power, this.colId + this.power,  1,  0],
      [1, this.rowId - 1, this.colId, this.rowId - this.power, this.colId - this.power, -1,  0],
      [0, this.rowId, this.colId + 1, this.rowId + this.power, this.colId + this.power,  0,  1],
      [1, this.rowId, this.colId - 1, this.rowId - this.power, this.colId - this.power,  0, -1],
    ];

    for (var dir = 0; dir < directions.length; dir++) {
      var d = directions[dir];
      for (var i = d[1], j = d[2]; (d[0] ? i >= d[3] && j >= d[4] : i <= d[3] && j <= d[4]);) {
        if (!bind(i, j) || this.blocked(i, j)) {
          break;
        }
        if (this.tryChain(i, j)) {
          break;
        }
        i += d[5];
        j += d[6];
      }
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
    this.type = dir;
    this.rowId = rowId;
    this.colId = colId;
    this.createTime = +new Date();
    this.ttl = 400 // 1秒

    var lootId = lootMatrix[this.rowId][this.colId];
    if (lootId) {
      remove(loots, lootId, lootMatrix);
    }

    var playerIds = Object.keys(playerMatrix[this.rowId][this.colId]);
    if (playerIds.length) {
      for (var i in playerIds) {
        players[playerIds[i]].downPlayer();
      }
    }
  }

  update(delta) {
    var nowTs = +new Date();
    if (this.createTime + this.ttl < nowTs) {
      remove(waves, this.id, waveMatrix);
      return;
    }
  }
}
waves = {};
var waveMatrix;

// =============================================================================
//  强化
// =============================================================================
class LootState extends EntityState {
  constructor(id, x, y) {
    super(id, x, y);

    var possibleTypes = [
      types.loot.speed,
      types.loot.power,
      types.loot.bombs,
    ];
    this.type = possibleTypes[getRandomInt(3)];
  }
}
loots = {};
var lootMatrix;

// =============================================================================
//  网络
// =============================================================================
msgQueue = new Queue(MAX_QUEUE_SIZE); // 客户端
clients = {};
function recvMessage(id, msg) {
  if (!(id in players)) {
    return;
  }
  players[id].msgQueue.push(msg);
}

// =============================================================================
//  UTIL
// =============================================================================
idQueue = new Queue(MAX_ID);

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function prepID(howMany) {
  for (var i = 1; i <= howMany; i++) {
    idQueue.push(i);
  }
}
function getID() {
  return idQueue.shift();
}
function releaseID(id) {
  idQueue.push(id);
}

function matrixToIntArray(m1, m2) {
  var array = [];

  for (var i = 0; i < MAX_ROW; i++) {
    var rowMask = 0;
    for (var j = 0; j < MAX_COL; j++) {
      rowMask |= (m1[i][j] > 0) << j;
    }
    for (var j = 0; j < MAX_COL; j++) {
      rowMask |= (m2[i][j] > 0) << MAX_COL + j;
    }
    array.push(rowMask);
  }

  return array;
}

function intArrayToMatrix(array) {
  var m1 = {};
  var m2 = {};

  for (var i = 0; i < MAX_ROW; i++) {
    m2[i] = {};
    for (var j = 0; j < MAX_COL; j++) {
      m2[i][j] = array[i] >> j & 1;
    }
    m1[i] = {};
    for (var j = 0; j < MAX_COL; j++) {
      m1[i][j] = array[i] >> j + MAX_COL & 1;
    }
  }

  return [m1, m2];
}

function matrixToStringArray(matrix, objects) {
  var array = [];

  for (var i = 0; i < MAX_ROW; i++) {
    var rowMask = '';
    for (var j = 0; j < MAX_COL; j++) {
      if (matrix[i][j]) {
        rowMask += objects[matrix[i][j]].type.toString();
      } else {
        rowMask += '0';
      }
    }
    array.push(rowMask);
  }

  return array;
}

function stringArrayToMatrix(array) {
  var matrix = {};

  for (var i = 0; i < MAX_ROW; i++) {
    matrix[i] = {};
    for (var j = 0; j < MAX_COL; j++) {
      matrix[i][j] = parseInt(array[i][j]);
    }
  }

  return matrix;
}


function clearMatrix(obj) {
  var matrix = new Array(MAX_ROW);
  for (var i = 0; i < MAX_ROW; i++) {
    matrix[i] = new Array(MAX_COL);
    for (var j = 0; j < MAX_COL; j++) {
      if (typeof obj != 'undefined') {
        matrix[i][j] = obj;
      } else {
        matrix[i][j] = 0;
      }
    }
  }

  return matrix;
}

function init(whichMap) {
  boxMatrix = clearMatrix();
  stoneMatrix = clearMatrix();
  bombMatrix = clearMatrix();
  lootMatrix = clearMatrix();
  waveMatrix = clearMatrix();
  playerMatrix = clearMatrix({});

  for (var i in loots) {
    remove(loots, i);
  }
  for (var i in boxes) {
    remove(boxes, i);
  }

  var map = maps[whichMap];
  for (var i = 0; i < MAX_ROW; i++) {
    for (var j = 0; j < MAX_COL; j++) {
      if (map[i][j] == 1) {
        var id = getID();
        boxes[id] = new BoxState(id, j * UNIT_WIDTH, i * UNIT_HEIGHT);
        boxMatrix[i][j] = id;
      } else if (map[i][j] == 2) {
        stoneMatrix[i][j] = 1;
      } else {
        boxMatrix[i][j] = 0;
      }
    }
  }
}

function handleClientMessage(msg, player) {
  switch (msg.o) {
  case types.opcode.move:
    msg.i.delta = 1000.0 / FRAME_RATE;
    player.applyInput(msg.i, true);
  break;
  case types.opcode.put_bomb:
    player.putBomb();
  break;
  }
}

function playerStateToInt(state) {
  var r1 = state.dir;
  r1 = r1 << 4 | state.currentBombNumber;
  r1 = r1 << 4 | state.maxBombNumber;
  r1 = r1 << 1 | state.downed;
  r1 = r1 << 4 | state.score;
  r1 = r1 << 2 | state.playerNum;

  var r2 = state.x;
  r2 = r2 << 10 | state.y;
  r2 = r2 << 5 | state.speed;
  return [r1, r2];
}

function intToPlayerState(state) {
  var s1 = state[0];
  var s2 = state[1];

  var ret = {};
  ret.speed = s2 & 0b11111; s2 >>= 5;
  ret.y = s2 & 0b1111111111; s2 >>= 10;
  ret.x = s2;

  ret.playerNum = s1 & 0b11; s1 >>= 2;
  ret.score = s1 & 0b1111; s1 >>= 4;
  ret.downed = s1 & 0b1; s1 >>= 1;
  ret.maxBombNumber = s1 & 0b1111; s1 >>= 4;
  ret.currentBombNumber = s1 & 0b1111; s1 >>= 4;
  ret.dir = s1;
  return ret;
}

function broadcastState() {
  var playerStates = [];
  for (var id in players) {
    var p = players[id];
    playerStates.push({
      id: id,
      aid: p.ackSeqId,
      s: playerStateToInt(p),
    });
  }

  for (var id in players) {
    clients[id].volatile.emit('opcode', {
      o: types.opcode.move,
      p: playerStates,
      bb: matrixToIntArray(bombMatrix, boxMatrix),
      w: matrixToStringArray(waveMatrix, waves),
      l: matrixToStringArray(lootMatrix, loots),
    });
  }
}

var currentMap = 0;
function restartGame() {
  currentMap = (currentMap + 1) % maps.length;
  init(currentMap);
  numPlayers = 0;
  for (var spawn in playerSpawns) {
    playerSpawns[spawn].spawn = true;
  }
  spawnedPlayers = {};
  for (var i in players) {
    doSpawn(i);
  }
  for (var id in players) {
    clients[id].emit('opcode', {o: types.opcode.new_map, m: currentMap});
  }
}

function serverUpdate(delta, callback) {
  for (var id in players) {
    var player = players[id];
    var queue = player.msgQueue;
    var ctr = 0;
    while (ctr < 5 && !queue.empty()) {
      ctr++;
      callback(queue.shift(), player);
    }
  }

  var shouldRestart = false;
  for (var id in players) {
    var player = players[id];
    shouldRestart |= player.score >= 5;

    if (player.downed) {
      player.downedFrame++;
      if (player.downedFrame == 50) { // 5秒
        player.revivePlayer();
      }
    }
  }

  if (shouldRestart) {
    restartGame();
  }

  // 更新其他
  for (var i in bombs) { bombs[i].update(delta); }

  for (var id in toDestroyBoxes) {
    var rand = getRandomInt(100);
    if (rand <= 30) { // 30%掉强化
      var lootId = getID();
      var x = boxes[id].x;
      var y = boxes[id].y;
      var rowId = boxes[id].rowId;
      var colId = boxes[id].colId;
      loots[lootId] = new LootState(lootId, x, y);
      lootMatrix[rowId][colId] = lootId;
    }

    remove(boxes, id, boxMatrix);
  }
  toDestroyBoxes = {};

  broadcastState();
  return true;
}

function update(delta, serverUpdateCallback, callback) {
  // 接收网络消息
  var server = serverUpdateCallback(delta, callback);

  for (var i = 0; i < MAX_ROW; i++) {
    for (var j = 0; j < MAX_COL; j++) {
      playerMatrix[i][j] = {};
    }
  }
  for (var id in players) {
    var player = players[id];
    var rowId = typeof player.state == 'undefined' ? player.rowId : player.state.rowId;
    var colId = typeof player.state == 'undefined' ? player.colId : player.state.colId;
    playerMatrix[rowId][colId][id] = 1;
  }
  for (var i in waves) { waves[i].update(delta); }

  if (server) {
    return;
  }

  while (!msgQueue.empty()) {
    callback(msgQueue.shift()); // handleMessage
  }

  // 更新玩家
  for (var i in players) { players[i].update(delta); }
}

function tick(delta, serverUpdateCallback, callback) {
  update(delta, serverUpdateCallback, callback);
}

playerSpawns = [
  {spawn: true, where: [0, UNIT_HEIGHT * (MAX_ROW - 1)]},
  {spawn: true, where: [0, 0]},
  {spawn: true, where: [UNIT_WIDTH * (MAX_COL - 1), 0]},
  {spawn: true, where: [UNIT_WIDTH * (MAX_COL - 1), UNIT_HEIGHT * (MAX_ROW - 1)]},
];
spawnedPlayers = {};

function doSpawn(id) {
  for (var i = 0; i < playerSpawns.length; i++) {
    var spawn = playerSpawns[i];
    if (!spawn.spawn) {
      continue;
    }
    var spawnX = spawn.where[0];
    var spawnY = spawn.where[1];
    players[id] = new PlayerState(id, spawnX, spawnY, UNIT_WIDTH, UNIT_HEIGHT, i);
    spawnedPlayers[id] = i;
    spawn.spawn = false;
    numPlayers++;
    clients[id].emit('opcode', {o: types.opcode.new_player, id: id, m: currentMap});
    break;
  }
}

function spawnPlayer(id, socket) {
  if (!(id in clients) && numPlayers < MAX_PLAYERS) {
    clients[id] = socket;
    doSpawn(id);
  } else {
    socket.disconnect();
  }
}

function disconnectPlayer(id) {
  if (id in clients) {
    delete clients[id];
    delete players[id];
    numPlayers--;
    playerSpawns[spawnedPlayers[id]].spawn = true;
    delete spawnedPlayers[id];
  }
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
E.init = init;
E.tick = tick;
E.spawnPlayer = spawnPlayer;
E.recvMessage = recvMessage;
E.handleClientMessage = handleClientMessage;
E.serverUpdate = serverUpdate;
E.SERVER_FRAME = SERVER_FRAME;
E.prepID = prepID;
E.disconnectPlayer = disconnectPlayer;
E.URL = URL
