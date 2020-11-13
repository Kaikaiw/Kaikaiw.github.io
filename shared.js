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
    put_bomb:          2,
    explode:           4,
    wave:              5,
    loot:              8,
    pickup_loot:       9,
    player:           12,
    move:             14,
    bomb:             15,
    box:              16,
    new_player:       17,
  }
};

// =============================================================================
//  全局配置 / 坐标转换
// =============================================================================
SERVER_FRAME = 5;
INFINITE = Number.MAX_VALUE;
MAX_ID = 131072;
MAX_QUEUE_SIZE = 1024;
MAX_ROW = 13;
MAX_COL = 15;
UNIT_WIDTH = 50;
UNIT_HEIGHT = 50;
WIDTH = UNIT_WIDTH * MAX_COL;
HEIGHT = UNIT_HEIGHT * MAX_ROW;
MAX_PLAYERS = 4;
numPlayers = 0;
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
    this.size = size;
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
    let d = this.data[this.queueL];
    this.queueL = (this.queueL + 1) % this.size;
    return d;
  }

  push(d) {
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
    this.stackedSpeed = 0;
    this.speed = 0.15;
    this.maxSpeed = 0.30;
    this.power = 1;
    this.maxPower = 8;
    this.currentBombNumber = 0;
    this.maxBombNumber = 1;
    this.maxMaxBombNumber = 8;
    this.buffer = new Queue(MAX_QUEUE_SIZE); // 插值玩家状态
    this.ackSeqId = 0; // 重建序列ID
    this.score = 0;
  }

  downPlayer() {
    if (!this.downed) {
      this.downed = true;
      this.stackedSpeed = this.speed;
      this.speed = 0.01;
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
        this.speed = Math.min(this.maxSpeed, this.speed + 0.02);
      break;
      case types.loot.power:
        this.power = Math.min(this.maxPower, this.power + 1);
      break;
      case types.loot.bombs:
        this.maxBombNumber = Math.min(this.maxMaxBombNumber, this.maxBombNumber + 1);
      break;
    }
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

    if (waveMatrix[toRowId][toColId]) {
      this.downPlayer();
    } 

    this.x = toX;
    this.y = toY;
    this.rowId = toRowId;
    this.colId = toColId;

    for (id in playerMatrix[this.rowId][this.colId]) {
      if (id == this.id) {
        continue;
      }
      if (players[id].downed) {
        players[id].revivePlayer();
        this.score++;
      }
    }


    var lootId = lootMatrix[this.rowId][this.colId];
    if (lootId) {
      this.pickupLoot(loots[lootId].type);
      remove(loots, lootId, lootMatrix)

      sendMessage({to: this.id, data: {opcode: types.opcode.pickup_loot,}});
    }
  }

  putBomb() {
    if (bombMatrix[this.rowId][this.colId] || boxMatrix[this.rowId][this.colId]) {
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
      }
    }
  }

  applyInput(input) {
    var key = input.key;
    var delta = input.delta;

    if (delta > 20 || delta <= 0) { // Anti-cheat
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
    bombMatrix[this.rowId][this.colId] = id;
  }

  blocked(rowId, colId) {
    return bind(rowId, colId) && boxMatrix[rowId][colId];
  }

  doBomb() {
    remove(bombs, this.id, bombMatrix);
    players[this.owner].currentBombNumber--;

    // 中
    var id = getID();
    waves[id] = new WaveState(id, this.rowId, this.colId, types.dir.up);
    waveMatrix[this.rowId][this.colId] = id;

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
      waveMatrix[r][this.colId] = id;
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
      waveMatrix[r][this.colId] = id;
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
      waveMatrix[this.rowId][c] = id;
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
      waveMatrix[this.rowId][c] = id;
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

    var lootId = lootMatrix[this.rowId][this.colId];
    if (lootId) {
      remove(loots, lootId, lootMatrix);
    }

    var playerIds = Object.keys(playerMatrix[this.rowId][this.colId]);
    if (playerIds.length) {
      for (i in playerIds) {
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
msgQueue = new Queue(MAX_QUEUE_SIZE);
sendQueue = new Queue(MAX_QUEUE_SIZE)
clients = {};

function sendMessage(msg) {
  if (!sendQueue.full()) {
    sendQueue.push(msg);
  }
}

function recvMessage(id, msg) {
  if (!msgQueue.full()) {
    msgQueue.push({id: id, msg: msg});
  }
}

// =============================================================================
//  UTIL
// =============================================================================
idQueue = new Queue(MAX_ID);

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function prepID(howMany) {
  for (i = 1; i <= howMany; i++) {
    idQueue.push(i);
  }
}
function getID() {
  return idQueue.shift();
}
function releaseID(id) {
  idQueue.push(id);
}

function init() {
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

  // 强化
  lootMatrix = new Array(MAX_ROW);
  for (i = 0; i < MAX_ROW; i++) {
    lootMatrix[i] = new Array(MAX_COL);
  }

  // 爆波
  waveMatrix = new Array(MAX_ROW);
  for (i = 0; i < MAX_ROW; i++) {
    waveMatrix[i] = new Array(MAX_COL);
  }

  // 玩家
  playerMatrix = new Array(MAX_ROW);
  for (i = 0; i < MAX_ROW; i++) {
    playerMatrix[i] = new Array(MAX_COL);
    for (j = 0; j < MAX_COL; j++) {
      playerMatrix[i][j] = {};
    }
  }

  for (i = 0; i < MAX_ROW; i++) {
    for (j = 0; j < MAX_COL; j++) {
      if (map[i][j] == 1 && !boxMatrix[i][j]) {
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
    sendMessage({to: id, data: { opcode: types.opcode.player, players: players, playerMatrix: playerMatrix}});
    sendMessage({to: id, data: { opcode: types.opcode.bomb, bombs: bombs,}});
    sendMessage({to: id, data: { opcode: types.opcode.wave, waves: waves,}});
    sendMessage({to: id, data: { opcode: types.opcode.box, boxes: boxes,}});
    sendMessage({to: id, data: { opcode: types.opcode.loot, loots: loots,}});
  }
}

function restartGame() {
  init();
  numPlayers = 0;
  for (i in players) {
    var spawnX = playerSpawns[numPlayers][0];
    var spawnY = playerSpawns[numPlayers][1];
    players[players[i].id] = new PlayerState(players[i].id, spawnX, spawnY, UNIT_WIDTH, UNIT_HEIGHT);
    numPlayers++;
  }
}

function serverUpdate(delta) {
  for (i = 0; i < MAX_ROW; i++) {
    for (j = 0; j < MAX_COL; j++) {
      playerMatrix[i][j] = {};
    }
  }

  var shouldRestart = false;
  for (id in players) {
    var player = players[id];
    playerMatrix[player.rowId][player.colId][id] = 1;
    shouldRestart |= player.score >= 5;
  }

  if (shouldRestart) {
    restartGame();
  }
}

function update(delta, serverUpdateCallback, callback, broadcast) {
  // 接收网络消息
  while (!msgQueue.empty()) {
    callback(msgQueue.shift()); // handleClientMessage
  }

  serverUpdateCallback(delta);

  // 更新玩家
  for (i in players) { players[i].update(delta); }
  // 更新其他
  for (i in waves) { waves[i].update(delta); }
  for (i in bombs) { bombs[i].update(delta); }

  for (id in toDestroyBoxes) {
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

  broadcast();
}

function processSend() {
  while (!sendQueue.empty()) {
    var msg = sendQueue.shift();
    clients[msg.to].emit('opcode', msg.data);
  }
}

function tick(delta, serverUpdateCallback, callback, broadcast) {
  update(delta, serverUpdateCallback, callback, broadcast);
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
    players[id] = new PlayerState(id, spawnX, spawnY, UNIT_WIDTH, UNIT_HEIGHT);
    numPlayers++;
  }

  sendMessage({to: id, data: {opcode: types.opcode.new_player, id: id,}});
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
E.sendMessage = sendMessage;
E.recvMessage = recvMessage;
E.processSend = processSend;
E.handleClientMessage = handleClientMessage;
E.broadcastState = broadcastState;
E.serverUpdate = serverUpdate;
E.SERVER_FRAME = SERVER_FRAME;
E.prepID = prepID;
