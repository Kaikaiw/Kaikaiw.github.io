if (typeof exports == 'undefined') {
  var exports = {};
}

// =============================================================================
//  类型
// =============================================================================
exports.types = {
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
    let d = this.data[this.queueL];
    this.queueL = (this.queueL + 1) % this.size;
    return d;
  }

  put(d) {
    this.data[this.queueR] = d;
    this.queueR = (this.queueR + 1) % this.size;
  }
}
exports.Queue = Queue;

// =============================================================================
//  全局配置 / 坐标转换
// =============================================================================
exports.INFINITE = Number.MAX_VALUE;
exports.MAX_ID = 131072;
exports.MAX_QUEUE = 1024;
exports.MAX_ROW;
exports.MAX_COL;
exports.WIDTH;
exports.HEIGHT;
exports.UNIT_WIDTH;
exports.UNIT_HEIGHT;

function bind(rowId, colId) {
  return rowId >= 0 && rowId < MAX_ROW && colId >= 0 && colId < MAX_COL;
}
exports.bind = bind;

// 转换垂直坐标到2d矩阵行
function getRowID(vertical) {
  return Math.floor((vertical + exports.UNIT_HEIGHT / 2) / exports.UNIT_HEIGHT);
}
exports.getRowID = getRowID;

// 转换水平坐标到2d矩阵列
function getColID(horizontal) {
  return Math.floor((horizontal + exports.UNIT_WIDTH / 2) / exports.UNIT_WIDTH);
}
exports.getColID = getColID;

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
}
exports.EntityState = EntityState;
exports.boxes = {};
exports.boxMatrix = {};

// =============================================================================
//  玩家核心
// =============================================================================
exports.PlayerState = class extends EntityState {
  constructor(id, x, y, sizeX, sizeY){
    super(id, x, y, sizeX, sizeY);
    this.downed = false;
    this.speed = 0.2;
  }

  downPlayer() {
    this.downed = true;
    this.speed = 0.01;
  }

  move(delta, dir) {
    this.dir = dir;
    let toX = this.x;
    let toY = this.y;

    switch(dir) {
    case exports.types.dir.up:
      toY = Math.max(0, this.y - this.speed * delta);
      break;
    case exports.types.dir.right:
      toX = Math.min(exports.WIDTH - this.sizeX, this.x + this.speed * delta);
      break;
    case exports.types.dir.down:
      toY = Math.min(exports.HEIGHT - this.sizeY, this.y + this.speed * delta);
      break;
    case exports.types.dir.left:
      toX = Math.max(0, this.x - this.speed * delta);
      break;
    }

    let toColId = getColID(toX);
    let toRowId = getRowID(toY);
    if ((toRowId != this.rowId || toColId != this.colId) &&
        (exports.bombMatrix[toRowId][toColId] || exports.boxMatrix[toRowId][toColId])) {
      return;
    }

    this.x = toX;
    this.y = toY;
    this.rowId = toRowId;
    this.colId = toColId;
  }

  applyInput(input) {
    let key = input.key;
    let delta = input.delta;

    switch (key) {
    case exports.types.key.up:
      this.move(delta, exports.types.dir.up);
      break;
    case exports.types.key.right:
      this.move(delta, exports.types.dir.right);
      break;
    case exports.types.key.down:
      this.move(delta, exports.types.dir.down);
      break;
    case exports.types.key.left:
      this.move(delta, exports.types.dir.left);
      break;
    }
  }
}
exports.players = {};

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
//     return bind(rowId, colId) && exports.boxMatrix[rowId][colId];
//   }
//
//   doBomb() {
//     exports.bombMatrix[this.rowId][this.colId] = 0;
//     delete bombs[this.id];
//     // [行, 列, 下一位置, 最大位置, 方向]
//     let waveToGenerate = [
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
//       let rowId = waveToGenerate[i][0];
//       let colId = waveToGenerate[i][1];
//       let nextRowOrColId = waveToGenerate[i][2];
//       let maxRowOrColId = waveToGenerate[i][3];
//       let dir = waveToGenerate[i][4];
//       if (bind(rowId, colId)) {
//         let id = IDPool.getID();
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
//     if (bind(rowId, colId) && exports.bombMatrix[rowId][colId]) {
//       bombs[this.id].chain.push(exports.bombMatrix[rowId][colId]);
//       bombs[exports.bombMatrix[rowId][colId]].chain.push(this.id);
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
exports.bombs = {};
// let bombVisit = {};
exports.bombMatrix = {};
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
//     if (exports.boxMatrix[this.rowId][this.colId]) {
//       this.nextRowOrColId = this.maxRowOrColId;
//     }
//   }
// }
exports.waves = {};


// =============================================================================
//  网络
// =============================================================================
exports.msgQueue = new Queue(exports.MAX_QUEUE);
exports.sendQueue = new Queue(exports.MAX_QUEUE);
exports.oldNetTs = 0;

// =============================================================================
//  UTIL
// =============================================================================
exports.GAME_LOOP = null; // 主循环
exports.FRAME_RATE = 0;
exports.oldTs = 0;

IDPool = {};
IDPool.idQueue = new Queue(exports.MAX_ID);

IDPool.prepID = function() {
  for (i = 0; i < exports.MAX_ID; i++) {
    IDPool.idQueue.put(i);
  }
}

IDPool.getID = function() {
  return IDPool.idQueue.pop();
}

IDPool.releaseID = function(id) {
  IDPool.idQueue.put(id);
}

exports.IDPool = IDPool;
