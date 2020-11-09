// =============================================================================
//  客户端
// =============================================================================
let pendingInputs = new exports.Queue(exports.MAX_QUEUE);

// =============================================================================
//  各种资源
// =============================================================================
let Resource = {};
Resource.pngMap = {};
Resource.sndMap = {};
// 图片读取为异步, 等待所有图片读取后init()
Resource.pngNum = 0;
Resource.pngNow = 0;
Resource.onReady = null;

Resource.loadSnds = function(resArray) {
  resArray.forEach(function(res) {
    let key = res[0];
    let val = res[1];
    let vol = res[2];
    let loop = res[3];
    let snd = new Audio(val);
    snd.volume = vol;
    snd.loop = loop;
    Resource.sndMap[key] = snd;
  });
};

Resource.loadPngs = function(resArray, onReady) {
  Resource.pngNum += resArray.length;
  Resource.onReady = onReady;

  resArray.forEach(function(kv) {
    let key = kv[0];
    let val = kv[1];
    let png = new Image();
    png.onload = function() {
      Resource.pngMap[key] = png;
      Resource.pngNow++;
      if (Resource.pngNow == Resource.pngNum)
        Resource.onReady();
    }
    Resource.pngMap[key] = false;
    png.src = val;
  });
};

Resource.getPng = function(key) {
  return Resource.pngMap[key];
};

Resource.playSnd = function(key) {
  Resource.sndMap[key].currentTime = 0;
  let promise = Resource.sndMap[key].play();
  if (promise !== undefined) {
    promise.then(_ => {
      // Autoplay started!
    }).catch(error => {
      setTimeout(function(){ Resource.playSnd(key); }, 1000);
      // Autoplay was prevented.
      // Show a "Play" button so that user can start playback.
    });
  }
};

// =============================================================================
//  素像
// =============================================================================
class Sprite {
  constructor(type, sizeX, sizeY, sizeDrawX, sizeDrawY) {
    // 大小 / 位置
    this.startX = 0;
    this.startY = 0;
    this.sizeX = sizeX;
    this.sizeY = sizeY;
    this.sizeDrawX = sizeDrawX;
    this.sizeDrawY = sizeDrawY;
    // 周期
    this.cycleTime = 0;
    this.currTime = 0;
    // 动画帧循环列表, 因为图片是横向衔接, 用于计算起画点
    this.currCycle = 0;
    this.maxCycle = 0;
    this.frameVector = [];
    this.type = type;
  }

  render(delta, positionX, positionY) {
    ctx.drawImage(
      Resource.getPng(this.type),
      // 图片起画点
      this.startX,
      this.startY,
      // 大小
      this.sizeX,
      this.sizeY,
      // 画哪
      positionX - (this.sizeDrawX - exports.UNIT_WIDTH) / 2,
      positionY - (this.sizeDrawY - exports.UNIT_HEIGHT),
      // 实际大小
      this.sizeDrawX,
      this.sizeDrawY
    );
  }

  updateDir(dir) {
    this.startY = this.sizeY * this.frameVector[dir];
  }

  update(delta) {
    this.currTime += delta;
    if (this.currTime >= this.cycleTime) {
      this.currTime = 0.0;
      this.currCycle = (this.currCycle + 1) % this.maxCycle;
      this.startX = this.sizeX * this.currCycle;
    }
  }
}

// =============================================================================
//  实体
// =============================================================================
class Entity {
  constructor() {
    this.sprite = null;
    this.state = null;
  }

  render(delta) {
    this.sprite.render(delta, this.state.x, this.state.y);
  }

  update(delta) {
    this.sprite.update(delta);
  }
}

// =============================================================================
//  块
// =============================================================================
class Block extends Entity {
  constructor(x, y) {
    super();
    // 魔法数字...
    this.state = new EntityState(-1, x, y, 64, 64);
    this.sprite =
        new Sprite(exports.types.entity.block, 64, 64, exports.UNIT_WIDTH, exports.UNIT_HEIGHT);
    this.sprite.startX =
        Math.floor(Math.random() * 5) * this.sprite.sizeX; // 0,1,2,3,4
    this.sprite.startY = 0;
    this.sprite.cycleTime = -1;
    this.sprite.maxCycle = 1;
  }
}
let blockMatrix;

// =============================================================================
//  盒子
// =============================================================================
class Box extends Entity {
  constructor(id, x, y) {
    super();
    this.state = new EntityState(id, x, y, 64, 79);
    // 魔法数字...
    this.sprite =
      new Sprite(exports.types.entity.box, 64, 79, exports.UNIT_WIDTH, exports.UNIT_HEIGHT * 1.23);
    this.sprite.cycleTime = -1;
    this.sprite.maxCycle = 1;
  }
}

// =============================================================================
//  掉落
// =============================================================================
class Loot extends Entity {
  constructor(id, x, y, type) {
    super();
    this.state = new EntityState(id, x, y, 32, 48);
    // 魔法数字...
    this.sprite = new Sprite(
        exports.types.entity.loot, 32, 48, exports.UNIT_WIDTH * 0.9375, exports.UNIT_HEIGHT * 0.9375);
    this.sprite.startX = type * this.sprite.sizeX;
    this.sprite.cycleTime = INFINITE;
    this.sprite.maxCycle = 1;
  }
}
let loots = {};

// =============================================================================
//  玩家
// =============================================================================
class Player extends Entity {
  constructor(id, x, y, sizeX, sizeY) {
    super();
    this.state = new exports.PlayerState(id, x, y, sizeX, sizeY);
    // 魔法数字...
    this.sprite = new Sprite(
        exports.types.entity.player, sizeX, sizeY, exports.UNIT_WIDTH * 1.5, exports.UNIT_HEIGHT * 1.875);
    this.sprite.maxCycle = 4;
    this.sprite.frameVector = [1,2,0,3];
    this.sprite.cycleTime = 170; // ms
    this.state.dir = exports.types.dir.down;
  }

  downPlayer() {
    this.state.downPlayer();
    // 魔法数字...
    this.sprite = new Sprite(
        exports.types.entity.player_downed,
        74,
        83,
        exports.UNIT_WIDTH * 1.5,
        exports.UNIT_HEIGHT * 1.875
    );
    this.sprite.maxCycle = 4;
    this.sprite.cycleTime = 170;
  }

  applyInput(input) {
    this.state.applyInput(input);
  }

  update(delta) {
    super.update(delta);
    if (!this.state.downed) {
      this.sprite.updateDir(this.state.dir);
    }

    let input = {};
    if (keyPressed[exports.types.key.up]) {
      input.delta = delta;
      input.key = exports.types.key.up;
    } else if (keyPressed[exports.types.key.right]) {
      input.delta = delta;
      input.key = exports.types.key.right;
    } else if (keyPressed[exports.types.key.down]) {
      input.delta = delta;
      input.key = exports.types.key.down;
    } else if (keyPressed[exports.types.key.left]) {
      input.delta = delta;
      input.key = exports.types.key.left;
    }

    if (Object.keys(input).length !== 0) {
      this.applyInput(input);

      // if (delta >= 50) {
      //   sendQueue.push({});
      // }
    }
  }
}
let localPlayerId;

// // =============================================================================
// //  炸弹
// // =============================================================================
// class Bomb extends Entity {
//   constructor(id, x, y, power) {
//     this.state = new BombState(id, x, y, power);
//     // 魔法数字...
//     this.sprite = new Sprite(exports.types.entity.bomb, 64, 64, 40, 40);
//     this.sprite.cycleTime = 170;
//     this.sprite.maxCycle = 3;
//   }
//
//   doChain() {
//     this.state.doChain();
//   }
//
//   chainBomb() {
//     this.state.chainBomb();
//   }
// }
// let bombs = [];
// let bombVisit = {};
// let exports.bombMatrix;
//
// // =============================================================================
// //  爆波
// // =============================================================================
// class Wave extends Entity {
//   constructor(id, x, y, dir, nextRowOrColId, maxRowOrColId) {
//     this.state = (id, x, y, dir, nextRowOrColId, maxRowOrColId);
//     this.currTime = 0;
//     this.cycleTime = 400;
//
//     this.sprite = new Sprite(exports.types.CHAR.WAVE, 64, 64, 40, 40);
//     this.sprite.startY = ((dir + 1) % 4) * this.sprite.sizeY;
//     this.sprite.cycleTime = 250;
//     this.sprite.maxCycle = 2;
//   }
//
//   update(delta) {
//
//   }
// }
// let Wave = Entity.extend({
//   update: function(dt) {
//     this._super(dt);
//
//     this.currTime += dt;
//     if (this.currTime >= this.spread_time) {
//       this.spread_time = INFINITE;
//       let to_spread = [];
//
//       switch(this.dir) {
//       case TYPES.DIRECTION.UP:
//         if (this.cs - 1 >= Math.max(0, this.bs))
//           to_spread.push([this.cs - 1, this.colId, this.cs - 1]);
//         break;
//       case TYPES.DIRECTION.RIGHT:
//         if (this.cs + 1 < exports.MAX_COL && this.cs + 1 <= this.bs)
//           to_spread.push([this.rowId, this.cs + 1, this.cs + 1]);
//         break;
//       case TYPES.DIRECTION.DOWN:
//         if (this.cs + 1 < exports.MAX_ROW && this.cs + 1 <= this.bs)
//           to_spread.push([this.cs + 1, this.colId, this.cs + 1]);
//         break;
//       case TYPES.DIRECTION.LEFT:
//         if (this.cs - 1 >= Math.max(0, this.bs))
//           to_spread.push([this.rowId, this.cs - 1, this.cs - 1]);
//         break;
//       }
//     }
//
//     for (ts in to_spread) {
//       let x = to_spread[ts][0];
//       let y = to_spread[ts][1];
//       let z = to_spread[ts][2];
//       let wid = Resource.getID();
//       waves[wid] = new Wave(wid, x, y, this.dir, z, this.bs);
//     }
//
//     if (this.currTime >= this.cycleTime) {
//       Resource.releaseID(this.id);
//       delete waves[this.id];
//     }
//   }
// });
// let waves = {};

// =============================================================================
//  客户端本体
// =============================================================================
// 画布
let ctx;
// 预测补正
let messageSequenceId = 0;
let pendingQueue = new Queue(exports.MAX_QUEUE);
// 键输入
let validKeys = {};
validKeys[exports.types.key.up] = 1;
validKeys[exports.types.key.right] = 1;
validKeys[exports.types.key.down] = 1;
validKeys[exports.types.key.left] = 1;
validKeys[exports.types.key.space] = 1;
let keyPressed = {};
// 时间

function init() {
  // 玩家输入
  document.addEventListener('keydown', function(e) {
    if (e.keyCode in validKeys) {
      keyPressed[e.keyCode] = true;
    }
  });
  document.addEventListener('keyup', function(e) {
    if (e.keyCode in validKeys) {
      keyPressed[e.keyCode] = false;
    }
  });

  // websocket
  let socket = io("0.0.0.0:8081");
  socket.on('connect', function(data) {
    socket.emit('stream');
  });
  socket.on('stream', streamGame);
  socket.on('opcode', function(msg) {
    if (!msgQueue.full()) {
      msgQueue.put(msg);
    }
  });
}

function streamGame(data) {
  // 场景维度
  exports.MAX_ROW = data.maxRow;
  exports.MAX_COL = data.maxCol;
  exports.UNIT_WIDTH = data.unitWidth;
  exports.UNIT_HEIGHT = data.unitHeight;
  exports.WIDTH = exports.UNIT_WIDTH * exports.MAX_COL;
  exports.HEIGHT = exports.UNIT_HEIGHT * exports.MAX_ROW;

  let canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d");
  canvas.width = exports.WIDTH;
  canvas.height = exports.HEIGHT;
  canvas.style.position = "absolute";

  // 背景
  blockMatrix = new Array(exports.MAX_ROW);
  for (i = 0; i < exports.MAX_ROW; i++) {
    blockMatrix[i] = new Array(exports.MAX_COL);
    for (j = 0; j < exports.MAX_COL; j++)
      blockMatrix[i][j] = new Block(j * exports.UNIT_WIDTH, i * exports.UNIT_HEIGHT);
  }

  // 箱子
  exports.boxMatrix = new Array(exports.MAX_ROW);
  for (i = 0; i < exports.MAX_ROW; i++) {
    exports.boxMatrix[i] = new Array(exports.MAX_COL);
    for (j = 0; j < exports.MAX_COL; j++) {
      exports.boxMatrix[i][j] = 0;
    }
  }
  for (i in data.boxes) {
    let box = data.boxes[i];
    exports.boxes[box.id] = new Box(box.id, box.x, box.y);
    exports.boxMatrix[box.rowId][box.colId] = 1;
  }

  // 炸弹
  exports.bombMatrix = new Array(exports.MAX_ROW);
  for (i = 0; i < exports.MAX_ROW; i++) {
    exports.bombMatrix[i] = new Array(exports.MAX_COL);
  }

  // 掉落
  exports.loots = {};
  for (i in data.loots) {
    let loot = data.loots[i];
    exports.loots[L[0]] = new Loot(loot.id, loot.x, loot.y, loot.type);
  }

  // 玩家
  exports.players = {};
  for (i in data.players) {
    let player = data.players[i];
    exports.players[player.id] = new Player(player.id, player.x, player.y, player.sizeX, player.sizeY);
    console.log('created ' + player.id);
    if (player.downed == true)
      exports.players[id].downPlayer();
  }

  // 开始游戏
  Resource.playSnd(exports.types.sound.bgm);
  exports.oldTs = +new Date();
  FRAME_RATE = 60;
  GAME_LOOP = setInterval(tick, 1000.0 / FRAME_RATE);
}

// function handleMessage(req) {
//   for (p in req.data) {
//     let packet = req.data[p];
//     let op = packet.op;
//     let data = packet.data;
//     switch (op) {
//     case TYPES.OP.MOVE:
//       for (p in data) {
//         let dt = data[p].delta;
//         let id = data[p].id;
//         let pos = data[p].pos;
//
//         if (dt) {
//           setPlayerPos(id, pos);
//           if (id == localPlayerId) {
//             let ack = data[p].ack;
//             pendingQueue[ack].time += dt;
//             while (ack != seq) {
//               let nack = (ack + 1) % MAX_QUEUE;
//               if (pendingQueue[ack].op == TYPES.OP.KEYD) {
//                 let next_time = (nack == seq) ? Date.now() : pendingQueue[nack].time;
//                 applyRec(pendingQueue[ack], Math.max(0, next_time - pendingQueue[ack].time));
//               }
//               ack = nack;
//             }
//           }
//         }
//       }
//       break;
//     case TYPES.OP.LAY:
//       for (b in data)
//         setBomb(data[b]);
//       break;
//     case TYPES.OP.CBOMB:
//       Resource.playSnd(TYPES.SOUND.EXP);
//       bomb_visit = {};
//       bombs[data.id].chainBomb(bombs[data.id]);
//       break;
//     case TYPES.OP.NBOX:
//       for (d in data) {
//         let B = exports.boxes[data[d]];
//         exports.boxMatrix[B.rowId][B.colId] = 0;
//         delete exports.boxes[data[d]];
//       }
//       break;
//     case TYPES.OP.LOOT:
//       for (d in data) {
//         let id = data[d].id;
//         let pos = data[d].pos;
//         loots[id] = new Loot(id, pos[0], pos[1], pos[2]);
//       }
//       break;
//     case TYPES.OP.NLOOT:
//       for (d in data)
//         delete loots[data[d]];
//       break;
//     case TYPES.OP.GLOOT:
//       Resource.playSnd(TYPES.SOUND.LOOT);
//       players[localPlayerId].speed = data.speed;
//       break;
//     case TYPES.OP.OFF:
//       delete players[data.id];
//       break;
//     case TYPES.OP.NEW:
//     case TYPES.OP.LOCAL:
//       let id = data[0];
//       let x = data[1];
//       let y = data[2];
//       let t = data[3];
//       let n = data[4];
//       players[id] = new Player(id, x, y, t);
//       if (op == TYPES.OP.LOCAL) {
//         localPlayerId = id;
//         players[localPlayerId].speed = data[5];
//       }
//       if (n)
//         players[id].doNetrual();
//       break;
//     case TYPES.OP.NETR:
//       for (p in data)
//         players[data[p]].doNetrual();
//       break;
//     }
//   }
// }
//
// function setPlayerPos(id, data) {
//   let x = data[0];
//   let y = data[1];
//   let d = data[2];
//   players[id].x = x;
//   players[id].y = y;
//   players[id].dir = d;
//   players[id].rowId = getRowID(y);
//   players[id].colId = getColID(x);
// }
//
// function setBomb(data) {
//   if (data.id == localPlayerId)
//     Resource.playSnd(TYPES.SOUND.LAY);
//   let pos = data.pos;
//   bombs[pos[0]] = new Bomb(pos[0], pos[1], pos[2], pos[3]);
//   exports.bombMatrix[bombs[pos[0]].rowId][bombs[pos[0]].colId] = pos[0];
//   bombs[pos[0]].doChain();
// }
//

function tick() {
  let nowTs = +new Date();
  let oldTs_ = exports.oldTs || nowTs;
  let delta = nowTs - oldTs_;
  exports.oldTs = nowTs;
  update(delta);
  render();
}

function update(delta) {
  // 接收网络消息
  if (!exports.msgQueue.empty()) {
    // handleMessage(exports.msgQueue.pop());
  }
  // 更新玩家
  for (i in exports.players) { exports.players[i].update(delta); }
  // 更新其他
  for (i in exports.waves) { exports.waves[i].update(delta); }
  for (i in exports.bombs) { exports.bombs[i].update(delta); }
  for (i in exports.boxes) { exports.boxes[i].update(delta); }
  for (i in exports.loots) { exports.loots[l].update(delta); }

  // 发送网络消息, Lockstep = 20FPS
  if (!exports.sendQueue.empty() && delta >= 50) {
    socket.emit('opcode', {data: exports.sendQueue.pop()});
  }
}

function render() {
  for (i = 0; i < exports.MAX_ROW; i++) {
    for (j = 0; j < exports.MAX_COL; j++) {
      blockMatrix[i][j].render();
    }
  }

  for (i in exports.waves) { exports.waves[w].render(); }
  for (i in exports.loots) { exports.loots[i].render(); }
  for (i in exports.players) { exports.players[i].render(); }
  for (i in exports.bombs) { exports.bombs[i].render(); }
  for (i in exports.boxes) { exports.boxes[i].render(); }
}

// =============================================================================
//  载入资源
// =============================================================================
Resource.loadSnds([ // [类型ID, 文件, 音量, 是否循环]
  [        exports.types.sound.bgm,   "bg.ogg", 0.3, 1],
  [   exports.types.sound.put_bomb,  "lay.wav",   1, 0],
  [    exports.types.sound.explode,  "exp.wav",   1, 0],
  [exports.types.sound.pickup_loot, "loot.wav",   1, 0]
]);

Resource.loadPngs([ // [类型ID, 文件]
  [       exports.types.entity.player,   "remi.png"],
  [         exports.types.entity.bomb,   "bomb.png"],
  [         exports.types.entity.wave,   "wave.png"],
  [        exports.types.entity.block,  "block.png"],
  [          exports.types.entity.box,    "box.png"],
  [         exports.types.entity.loot,   "loot.png"],
  [exports.types.entity.player_downed,   "netu.png"]],
  init
);
