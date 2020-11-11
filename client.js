// =============================================================================
//  客户端
// =============================================================================
inputSeqId = 0;
pendingInputs = [] // 预测后输入重建

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
    if (this.frameVector.length) {
      this.startY = this.sizeY * this.frameVector[dir];
    }
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
    this.state.update(delta);
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
    // 魔法数字...
    this.state = new BoxState(id, x, y);
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
    // 魔法数字...
    this.state = new EntityState(id, x, y, 48, 48);
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
    this.spacePressed = false;
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

    var shouldProcessSpace = !this.spacePressed && keyPressed[types.key.space];
    this.spacePressed = keyPressed[types.key.space];
    if (shouldProcessSpace) {
      sendMessage({
        'opcode': types.opcode.put_bomb,
      });
      Resource.playSnd(types.sound.put_bomb);
    }

    if (Object.keys(input).length != 0 && !shouldProcessSpace) {
      this.applyInput(input);

      input.seqId = inputSeqId++;
      sendMessage({
        'opcode': types.opcode.move,
        'input': input,
      });

      pendingInputs.push(input);
    }
  }
}
localPlayerId = "";

// =============================================================================
//  炸弹
// =============================================================================
class Bomb extends Entity {
  constructor(id, x, y) {
    super();
    // 魔法数字...
    this.sprite = new Sprite(types.entity.bomb, 64, 64, 64, 64);
    this.sprite.cycleTime = 150;
    this.sprite.maxCycle = 3;
    this.state = new BombState(id, x, y, 0);
    this.state.x = this.state.colId * UNIT_WIDTH;
    this.state.y = this.state.rowId * UNIT_HEIGHT;
  }

  update(delta) {
    this.sprite.update(delta);
    // pass...
  }
}

// =============================================================================
//  爆波
// =============================================================================
class Wave extends Entity {
  constructor(id, rowId, colId, dir) {
    super();
    // 魔法数字...
    this.sprite = new Sprite(types.entity.wave, 64, 64, 50, 50);
    this.sprite.startY = ((dir + 1) % 4) * this.sprite.sizeY;
    this.sprite.cycleTime = 250;
    this.sprite.maxCycle = 2;
    this.state = new WaveState(id, rowId, colId, 0, 0);
    this.state.x = this.state.colId * UNIT_WIDTH;
    this.state.y = this.state.rowId * UNIT_HEIGHT;
  }

  update(delta) {
    this.sprite.update(delta);
  }
}

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
  var socket = io("ws://192.168.8.191:8081");
  socket.on('connect', function(data) {
    socket.emit('stream');
  });
  socket.on('stream', streamGame);
  socket.on('opcode', function(msg) {
    recvMessage('server', msg);
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

function handleMessage(data) {
  var id = data.id;
  var msg = data.msg;

  switch (msg.opcode) {
    case types.opcode.move:
      var id = msg.id;
      var player = players[id];

      if (id === localPlayerId) {
        setPlayerPosition(player, msg.x, msg.y, msg.dir);

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
        player.state.dir = msg.dir;
        player.state.buffer.push({'ts': +new Date(), 'x': msg.x, 'y': msg.y,});
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
    case types.opcode.bomb:
      for (id in bombs) {
        if (!(id in msg.bombs)) {
          bombMatrix[bombs[id].state.rowId][bombs[id].state.colId] = 0;
          delete bombs[id];
          Resource.playSnd(types.sound.explode);
        }
      }
      for (id in msg.bombs) {
        if (!(id in bombs)) {
          var bomb = new Bomb(id, msg.bombs[id].x, msg.bombs[id].y);
          bombs[id] = bomb;
        }
      }
    break;
    case types.opcode.wave:
      for (id in waves) {
        if (!(id in msg.waves)) {
          delete waves[id];
        }
      }
      for (id in msg.waves) {
        if (!(id in waves)) {
          var wave = 
            new Wave(id, msg.waves[id].rowId, msg.waves[id].colId, msg.waves[id].dir);
          waves[id] = wave;
        }
      }
    break;
    case types.opcode.box:
      for (id in boxes) {
        if (!(id in msg.boxes)) {
          boxMatrix[boxes[id].state.rowId][boxes[id].state.colId] = 0;
          delete boxes[id];
        }
      }
      for (id in msg.boxes) {
        if (!(id in boxes)) {
          var box = new Box(id, msg.boxes[id].x, msg.boxes[id].y);
          boxes[id] = box;
        }
      }
    break;
  }
    // var packet = req.data[p];
    // var op = packet.op;
    // var data = packet.data;
    // switch (op) {
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
    // }
}

function serverBroadCast() {
  // pass
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
  }

  // 炸弹
  bombMatrix = new Array(MAX_ROW);
  for (i = 0; i < MAX_ROW; i++) {
    bombMatrix[i] = new Array(MAX_COL);
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
    render(tick(handleMessage, serverBroadCast));
    clientProcessSend();
  }, 1000.0 / 60); // 60FPS 游戏循环
}

function render(delta) {
  for (i = 0; i < MAX_ROW; i++) {
    for (j = 0; j < MAX_COL; j++) {
      blockMatrix[i][j].render(delta);
    }
  }

  for (i in loots) { loots[i].render(delta); }
  for (i in bombs) { bombs[i].render(delta); }
  for (i in waves) { waves[i].render(delta); }
  for (i in players) { players[i].render(delta); }
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
