// =============================================================================
//  客户端
// =============================================================================
inputSeqId = 0;
pendingInputs = [] // 预测后输入重建
stateBuffer = []   // 插值其他玩家状态

// =============================================================================
//  各种资源
// =============================================================================
Resource = {};
Resource.pngMap = {};
Resource.sndMap = {};
// 图片读取为异步, 等待所有图片读取后init()
Resource.pngNum = 0;
Resource.pngNow = 0;
Resource.onReady = null;

Resource.loadSnds = function(resArray) {
  resArray.forEach(function(res) {
    var key = res[0];
    var val = res[1];
    var vol = res[2];
    var loop = res[3];
    var snd = new Audio(val);
    snd.volume = vol;
    snd.loop = loop;
    Resource.sndMap[key] = snd;
  });
};

Resource.loadPngs = function(resArray, onReady) {
  Resource.pngNum += resArray.length;
  Resource.onReady = onReady;

  resArray.forEach(function(kv) {
    var key = kv[0];
    var val = kv[1];
    var png = new Image();
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
  var promise = Resource.sndMap[key].play();
  if (promise != undefined) {
    promise.then(_ => {
      // Autoplay started!
    }).catch(error => {
      setTimeout(function(){ Resource.playSnd(key); }, 1000);
      // Autoplay was prevented.
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
      positionX - (this.sizeDrawX - UNIT_WIDTH) / 2,
      positionY - (this.sizeDrawY - UNIT_HEIGHT),
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
        new Sprite(types.entity.block, 64, 64, UNIT_WIDTH, UNIT_HEIGHT);
    this.sprite.startX =
        Math.floor(Math.random() * 5) * this.sprite.sizeX; // 0,1,2,3,4
    this.sprite.startY = 0;
    this.sprite.cycleTime = -1;
    this.sprite.maxCycle = 1;
  }
}
var blockMatrix;

// =============================================================================
//  盒子
// =============================================================================
class Box extends Entity {
  constructor(id, x, y) {
    super();
    this.state = new EntityState(id, x, y, 64, 79);
    // 魔法数字...
    this.sprite =
      new Sprite(types.entity.box, 64, 79, UNIT_WIDTH, UNIT_HEIGHT * 1.23);
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
        types.entity.loot, 32, 48, UNIT_WIDTH * 0.9375, UNIT_HEIGHT * 0.9375);
    this.sprite.startX = type * this.sprite.sizeX;
    this.sprite.cycleTime = INFINITE;
    this.sprite.maxCycle = 1;
  }
}
loots = {};

// =============================================================================
//  玩家
// =============================================================================
class Player extends Entity {
  constructor(id, x, y, sizeX, sizeY) {
    super();
    this.state = new PlayerState(id, x, y, sizeX, sizeY);
    // 魔法数字...
    this.sprite = new Sprite(
        types.entity.player, sizeX, sizeY, UNIT_WIDTH * 1.5, UNIT_HEIGHT * 1.875);
    this.sprite.maxCycle = 4;
    this.sprite.frameVector = [1,2,0,3];
    this.sprite.cycleTime = 170; // ms
    this.state.dir = types.dir.down;
  }

  downPlayer() {
    this.state.downPlayer();
    // 魔法数字...
    this.sprite = new Sprite(
        types.entity.player_downed,
        74,
        83,
        UNIT_WIDTH * 1.5,
        UNIT_HEIGHT * 1.875
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

    if (this.state.id != localPlayerId) {
      return;
    }

    var input = {};
    if (keyPressed[types.key.up]) {
      input.delta = delta;
      input.key = types.key.up;
    } else if (keyPressed[types.key.right]) {
      input.delta = delta;
      input.key = types.key.right;
    } else if (keyPressed[types.key.down]) {
      input.delta = delta;
      input.key = types.key.down;
    } else if (keyPressed[types.key.left]) {
      input.delta = delta;
      input.key = types.key.left;
    }

    if (Object.keys(input).length != 0) {
      this.applyInput(input);

      input.seqId = inputSeqId++;
      sendMessage({
        'opcode': types.opcode.move,
        'id': localPlayerId,
        'input': input,
      });

      pendingInputs.push(input);
    }
  }
}
localPlayerId = "";

// // =============================================================================
// //  炸弹
// // =============================================================================
// class Bomb extends Entity {
//   constructor(id, x, y, power) {
//     this.state = new BombState(id, x, y, power);
//     // 魔法数字...
//     this.sprite = new Sprite(types.entity.bomb, 64, 64, 40, 40);
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
// var bombs = [];
// var bombVisit = {};
// var bombMatrix;
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
//     this.sprite = new Sprite(types.CHAR.WAVE, 64, 64, 40, 40);
//     this.sprite.startY = ((dir + 1) % 4) * this.sprite.sizeY;
//     this.sprite.cycleTime = 250;
//     this.sprite.maxCycle = 2;
//   }
//
//   update(delta) {
//
//   }
// }
// var Wave = Entity.extend({
//   update: function(dt) {
//     this._super(dt);
//
//     this.currTime += dt;
//     if (this.currTime >= this.spread_time) {
//       this.spread_time = INFINITE;
//       var to_spread = [];
//
//       switch(this.dir) {
//       case TYPES.DIRECTION.UP:
//         if (this.cs - 1 >= Math.max(0, this.bs))
//           to_spread.push([this.cs - 1, this.colId, this.cs - 1]);
//         break;
//       case TYPES.DIRECTION.RIGHT:
//         if (this.cs + 1 < MAX_COL && this.cs + 1 <= this.bs)
//           to_spread.push([this.rowId, this.cs + 1, this.cs + 1]);
//         break;
//       case TYPES.DIRECTION.DOWN:
//         if (this.cs + 1 < MAX_ROW && this.cs + 1 <= this.bs)
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
//       var x = to_spread[ts][0];
//       var y = to_spread[ts][1];
//       var z = to_spread[ts][2];
//       var wid = Resource.getID();
//       waves[wid] = new Wave(wid, x, y, this.dir, z, this.bs);
//     }
//
//     if (this.currTime >= this.cycleTime) {
//       Resource.releaseID(this.id);
//       delete waves[this.id];
//     }
//   }
// });
// waves = {};

// =============================================================================
//  客户端本体
// =============================================================================
// 画布
var ctx;
// 预测补正
messageSequenceId = 0;
// 键输入
validKeys = {};
validKeys[types.key.up] = 1;
validKeys[types.key.right] = 1;
validKeys[types.key.down] = 1;
validKeys[types.key.left] = 1;
validKeys[types.key.space] = 1;
keyPressed = {};
var server;

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
  var socket = io("192.168.8.191:8081");
  socket.on('connect', function(data) {
    socket.emit('stream');
  });
  socket.on('stream', streamGame);
  socket.on('opcode', function(msg) {
    recvMessage(msg);
  });
  server = socket;
}

function setPlayerPosition(player, x, y, dir) {
  player.state.x = x;
  player.state.y = y;
  player.state.dir = dir;
  player.state.rowId = getRowID(y);
  player.state.colId = getColID(x);
}

// function setBomb(data) {
//   if (data.id == localPlayerId)
//     Resource.playSnd(TYPES.SOUND.LAY);
//   var pos = data.pos;
//   bombs[pos[0]] = new Bomb(pos[0], pos[1], pos[2], pos[3]);
//   bombMatrix[bombs[pos[0]].rowId][bombs[pos[0]].colId] = pos[0];
//   bombs[pos[0]].doChain();
// }

function handleMessage(msg) {
  switch (msg.opcode) {
    case types.opcode.move:
      var id = msg.id;
      var player = players[id];

      setPlayerPosition(player, msg.x, msg.y, msg.dir);
      if (id === localPlayerId) {
        var i = 0;
        while (i < pendingInputs.length) {
          var pendingInput = pendingInputs[i];
          if (pendingInput.seqId <= msg.ackSeqId) {
            pendingInputs.splice(i, 1);
          } else {
            player.applyInput(pendingInput);
            i++;
          }
        }
      } else {
        // 其他玩家的移动插值
      }
    break;
    case types.opcode.new_player:
    case types.opcode.new_player_local:
      var player = msg.player;

      players[player.id] = 
          new Player(player.id, player.x, player.y, player.sizeX, player.sizeY);
      if (player.downed == true) {
        players[id].downPlayer();
      }

      if (msg.opcode == types.opcode.new_player_local) {
        localPlayerId = player.id;
        players[localPlayerId].speed = player.speed;
      }
    break;
    case types.opcode.offline:
      delete players[msg.id];
    break;
  }
    // var packet = req.data[p];
    // var op = packet.op;
    // var data = packet.data;
    // switch (op) {
    // case TYPES.OP.LAY:
    //   for (b in data)
    //     setBomb(data[b]);
    //   break;
    // case TYPES.OP.CBOMB:
    //   Resource.playSnd(TYPES.SOUND.EXP);
    //   bomb_visit = {};
    //   bombs[data.id].chainBomb(bombs[data.id]);
    //   break;
    // case TYPES.OP.NBOX:
    //   for (d in data) {
    //     var B = boxes[data[d]];
    //     boxMatrix[B.rowId][B.colId] = 0;
    //     delete boxes[data[d]];
    //   }
    //   break;
    // case TYPES.OP.LOOT:
    //   for (d in data) {
    //     var id = data[d].id;
    //     var pos = data[d].pos;
    //     loots[id] = new Loot(id, pos[0], pos[1], pos[2]);
    //   }
    //   break;
    // case TYPES.OP.NLOOT:
    //   for (d in data)
    //     delete loots[data[d]];
    //   break;
    // case TYPES.OP.GLOOT:
    //   Resource.playSnd(TYPES.SOUND.LOOT);
    //   players[localPlayerId].speed = data.speed;
    //   break;
    // case TYPES.OP.OFF:
    //   delete players[data.id];
    //   break;
    // case TYPES.OP.NETR:
    //   for (p in data)
    //     players[data[p]].doNetrual();
    //   break;
    // }
}

function clientProcessSend() {
  while (sendQueue.length > 0) {
    server.emit('opcode', sendQueue.shift());
  }
}

function streamGame(data) {
  var canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  canvas.style.position = "absolute";

  // 背景
  blockMatrix = new Array(MAX_ROW);
  for (i = 0; i < MAX_ROW; i++) {
    blockMatrix[i] = new Array(MAX_COL);
    for (j = 0; j < MAX_COL; j++)
      blockMatrix[i][j] = new Block(j * UNIT_WIDTH, i * UNIT_HEIGHT);
  }

  // 箱子
  boxMatrix = new Array(MAX_ROW);
  for (i = 0; i < MAX_ROW; i++) {
    boxMatrix[i] = new Array(MAX_COL);
    for (j = 0; j < MAX_COL; j++) {
      boxMatrix[i][j] = 0;
    }
  }
  for (i in data.boxes) {
    var box = data.boxes[i];
    boxes[box.id] = new Box(box.id, box.x, box.y);
    boxMatrix[box.rowId][box.colId] = 1;
  }

  // 炸弹
  bombMatrix = new Array(MAX_ROW);
  for (i = 0; i < MAX_ROW; i++) {
    bombMatrix[i] = new Array(MAX_COL);
  }

  // 掉落
  loots = {};
  for (i in data.loots) {
    var loot = data.loots[i];
    loots[L[0]] = new Loot(loot.id, loot.x, loot.y, loot.type);
  }

  // 玩家
  players = {};
  for (i in data.players) {
    var player = data.players[i];
    players[player.id] = 
        new Player(player.id, player.x, player.y, player.sizeX, player.sizeY);
    if (player.downed == true) {
      players[id].downPlayer();
    }
  }

  // 开始游戏
  Resource.playSnd(types.sound.bgm);
  oldTs = +new Date();
  setInterval(function () {
    render(tick(handleMessage));
    clientProcessSend();
  }, 1000.0 / 60); // 60FPS 游戏循环
}

function render(delta) {
  for (i = 0; i < MAX_ROW; i++) {
    for (j = 0; j < MAX_COL; j++) {
      blockMatrix[i][j].render(delta);
    }
  }

  for (i in waves) { waves[w].render(delta); }
  for (i in loots) { loots[i].render(delta); }
  for (i in players) { players[i].render(delta); }
  for (i in bombs) { bombs[i].render(delta); }
  for (i in boxes) { boxes[i].render(delta); }
}

// =============================================================================
//  载入资源
// =============================================================================
Resource.loadSnds([ // [类型ID, 文件, 音量, 是否循环]
  [        types.sound.bgm,   "bg.ogg", 0.3, 1],
  [   types.sound.put_bomb,  "lay.wav",   1, 0],
  [    types.sound.explode,  "exp.wav",   1, 0],
  [types.sound.pickup_loot, "loot.wav",   1, 0]
]);

Resource.loadPngs([ // [类型ID, 文件]
  [       types.entity.player,   "remi.png"],
  [         types.entity.bomb,   "bomb.png"],
  [         types.entity.wave,   "wave.png"],
  [        types.entity.block,  "block.png"],
  [          types.entity.box,    "box.png"],
  [         types.entity.loot,   "loot.png"],
  [types.entity.player_downed,   "netu.png"]],
  init
);
