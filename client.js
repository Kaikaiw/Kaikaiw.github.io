// =============================================================================
//  客户端
// =============================================================================
inputSeqId = 0;
pendingInputs = new Queue(MAX_QUEUE_SIZE); // 预测后输入重建

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
    }).catch(error => {
      setTimeout(function(){ Resource.playSnd(key); }, 1000);
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

  renderWith(delta, positionX, positionY, startX, startY) {
    ctx.drawImage(
      Resource.getPng(this.type),
      // 图片起画点
      startX,
      startY,
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

  renderAt(delta, x, y)  {
    this.sprite.render(delta, x, y);
  }

  renderWithAt(delta, x, y, startX, startY) {
    this.sprite.renderWith(delta, x, y, startX, startY);
  }

  update(delta) {
    this.sprite.update(delta);
    if (this.state) {
      this.state.update(delta);
    }
  }
}

// =============================================================================
//  块
// =============================================================================
class Block extends Entity {
  constructor(x, y) {
    super();
    // 魔法数字...
    this.sprite =
        new Sprite(types.entity.block, UNIT_WIDTH, UNIT_HEIGHT, UNIT_WIDTH, UNIT_HEIGHT);
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
//  强化
// =============================================================================
class Loot extends Entity {
  constructor(id, x, y, type) {
    super();
    // 魔法数字...
    this.state = new EntityState(id, x, y);
    this.sprite = new Sprite(
        types.entity.loot, 32, 48, UNIT_WIDTH, UNIT_HEIGHT * 1.5);
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
    this.sprite = new Sprite(types.entity.player, 96, 118, 96, 118);
    this.sprite.maxCycle = 4;
    this.sprite.frameVector = [0,1,2,0,3];
    this.sprite.cycleTime = 170; // ms
    this.state.dir = types.dir.down;
    this.spacePressed = false;
  }

  downPlayer() {
    this.state.downPlayer();
    // 魔法数字...
    this.sprite = new Sprite(types.entity.player_downed, 74, 83, 74, 83);
    this.sprite.cycleTime = 200;
    this.sprite.maxCycle = 4;
  }

  revivePlayer() {
    this.state.revivePlayer();
    this.sprite = new Sprite(types.entity.player, 96, 118, 96, 118);
    this.sprite.frameVector = [0,1,2,0,3];
    this.sprite.cycleTime = 170; // ms
    this.sprite.maxCycle = 4;
  }

  applyInput(input) {
    this.state.applyInput(input, false);
  }

  update(delta) {
    super.update(delta);
    this.sprite.updateDir(this.state.dir);

    if (this.state.id != localPlayerId) {
      return;
    }

    var input = {};
    if (keyPressed[types.key.up]) {
      input.key = types.key.up;
    } else if (keyPressed[types.key.right]) {
      input.key = types.key.right;
    } else if (keyPressed[types.key.down]) {
      input.key = types.key.down;
    } else if (keyPressed[types.key.left]) {
      input.key = types.key.left;
    }

    var shouldProcessSpace = !this.spacePressed && keyPressed[types.key.space];
    this.spacePressed = keyPressed[types.key.space];
    if (shouldProcessSpace && this.state.currentBombNumber < this.state.maxBombNumber) {
      server.emit('opcode', {opcode: types.opcode.put_bomb,});
      Resource.playSnd(types.sound.put_bomb);
    }

    if (Object.keys(input).length && !shouldProcessSpace) {
      input.seqId = inputSeqId++;
      server.volatile.emit('opcode', {opcode: types.opcode.move, input: input},);
      var localInput = Object.assign({}, input);
      localInput.delta = delta;
      this.applyInput(localInput);
      pendingInputs.push(localInput);
    }
  }
}
localPlayerId = '';

// =============================================================================
//  炸弹
// =============================================================================
class Bomb extends Entity {
  constructor(id, x, y) {
    super();
    // 魔法数字...
    this.sprite = new Sprite(types.entity.bomb, 64, 64, 88, 88);
    this.sprite.cycleTime = 150;
    this.sprite.maxCycle = 3;
  }

  update(delta) {
    this.sprite.update(delta);
  }
}

// =============================================================================
//  爆波
// =============================================================================
class Wave extends Entity {
  constructor(id, rowId, colId, dir) {
    super();
    // 魔法数字...
    this.sprite = new Sprite(types.entity.wave, UNIT_WIDTH, UNIT_HEIGHT, UNIT_WIDTH, UNIT_HEIGHT);
    this.sprite.cycleTime = 250;
    this.sprite.maxCycle = 2;
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
var score;
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

  initGame();

  // websocket
  var socket = io('ws://' + URL + '8081', {
    withCredentials: true,
  });
  socket.on('opcode', function(msg) {
    msgQueue.push(msg);
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

function handleMessage(msg) {
  switch (msg.opcode) {
    case types.opcode.new_player:
      localPlayerId = msg.id;
    break;
    case types.opcode.move:
      for (var id in players) {
        if (!(id in msg.players)) {
          delete players[id];
        }
      }

      for (var id in msg.players) {
        var remotePlayer = msg.players[id];
        if (!(id in players)) { // 创建玩家
          players[id] = new Player(
            id, remotePlayer.x, remotePlayer.y, remotePlayer.sizeX, remotePlayer.sizeY);
        }

        var player = players[id];

        if (id === localPlayerId) {
          setPlayerPosition(player, remotePlayer.x, remotePlayer.y, remotePlayer.dir);

          while (!pendingInputs.empty()) {
            var pendingInput = pendingInputs.peek();
            if (pendingInput.seqId <= remotePlayer.ackSeqId) {
              pendingInputs.shift();
            } else {
              break;
            }
          }

          player.state.speed = remotePlayer.speed;
          pendingInputs.iterate((pendingInput) => {
            player.applyInput(pendingInput);
          });
        } else {
          player.state.dir = remotePlayer.dir;
          player.state.buffer.push({'ts': +new Date(), 'x': remotePlayer.x, 'y': remotePlayer.y,});
        }

        player.state.score = remotePlayer.score;
        player.state.power = remotePlayer.power;
        player.state.currentBombNumber = remotePlayer.currentBombNumber;
        player.state.maxBombNumber = remotePlayer.maxBombNumber;

        if (!player.state.downed && remotePlayer.downed) {
          player.downPlayer();
        } if (player.state.downed && !remotePlayer.downed) {
          player.revivePlayer();
        }
      }

      var newBombMatrix = intArrayToMatrix(msg.bombs);
      var bombed = false;
      for (var i = 0; i < MAX_ROW; i++) {
        for (var j = 0; j < MAX_COL; j++) {
          if (bombMatrix[i][j] && !newBombMatrix[i][j]) {
            bombed = true;
          }
          bombMatrix[i][j] = newBombMatrix[i][j];
        }
      }
      if (bombed) {
        Resource.playSnd(types.sound.explode);
      }
      waveMatrix = stringArrayToMatrix(msg.waves);
      boxMatrix = intArrayToMatrix(msg.boxes);
      lootMatrix = stringArrayToMatrix(msg.loots);
    break;
    case types.opcode.pickup_loot:
      Resource.playSnd(types.sound.pickup_loot);
    break;
  }
}

// 享元
var block = new Block(0, 0);
var box = new Box(0, -1, -1);
var bomb = new Bomb(0, -1, -1);
var loot = new Loot(0, -1, -1, 0);
var wave = new Wave(0, -1, -1, 0);

function initGame() {
  var canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  canvas.style.position = 'absolute';
  score = document.getElementById('score');

  // 背景
  blockMatrix = new Array(MAX_ROW);
  for (var i = 0; i < MAX_ROW; i++) {
    blockMatrix[i] = new Array(MAX_COL);
    for (var j = 0; j < MAX_COL; j++)
      blockMatrix[i][j] = Math.floor(Math.random() * 5);
  }

  boxMatrix = clearMatrix();
  bombMatrix = clearMatrix();
  lootMatrix = clearMatrix();
  waveMatrix = clearMatrix();
  playerMatrix = clearMatrix({});

  // 开始游戏
  Resource.playSnd(types.sound.bgm);
  oldTs = +new Date();
  var delta = 1000.0 / 60;
  setInterval(function () {
    tick(delta, () => { return false; }, handleMessage);
    render(delta);
    bomb.update(delta);
  }, delta);
}

function render(delta) {
  for (var i = 0; i < MAX_ROW; i++) {
    for (var j = 0; j < MAX_COL; j++) {
      block.renderWithAt(0, j * UNIT_WIDTH, i * UNIT_HEIGHT, blockMatrix[i][j] * block.sprite.sizeX, 0);
    }
  }

  for (var i = 0; i < MAX_ROW; i++) {
    var playersToRender = [];
    for (var j = 0; j < MAX_COL; j++) {
      if (boxMatrix[i][j]) {
        box.renderAt(0, j * UNIT_WIDTH, i * UNIT_HEIGHT);
      }
      if (waveMatrix[i][j]) {
        wave.renderWithAt(0, j * UNIT_WIDTH, i * UNIT_HEIGHT, 0, (waveMatrix[i][j] % 4) * wave.sprite.sizeY);
      }
      if (bombMatrix[i][j]) {
        bomb.renderAt(0, j * UNIT_WIDTH, i * UNIT_HEIGHT);
      }
      if (lootMatrix[i][j]) {
        loot.renderWithAt(0, j * UNIT_WIDTH, i * UNIT_HEIGHT, lootMatrix[i][j] * loot.sprite.sizeX, 0);
      }
      for (var playerId in playerMatrix[i][j]) {
        playersToRender.push(playerId);
      }
    }

    for (var playerId in playersToRender) {
      players[playersToRender[playerId]].render(delta);
    }
  }

  var scoreText = '';
  for (var i in players) {
    scoreText += players[i].state.score.toString() + ' ';
  }
  score.innerHTML = scoreText;
}

// =============================================================================
//  载入资源
// =============================================================================
Resource.loadSnds([ // [类型ID, 文件, 音量, 是否循环]
  [        types.sound.bgm,   'bg.ogg', 0.3, 1],
  [   types.sound.put_bomb,  'lay.wav',   1, 0],
  [    types.sound.explode,  'exp.wav',   1, 0],
  [types.sound.pickup_loot, 'loot.wav',   1, 0]
]);

Resource.loadPngs([ // [类型ID, 文件]
  [       types.entity.player,   'remi.png'],
  [         types.entity.bomb,   'bomb.png'],
  [         types.entity.wave,   'wave.png'],
  [        types.entity.block,  'block.png'],
  [          types.entity.box,    'box.png'],
  [         types.entity.loot,   'loot.png'],
  [types.entity.player_downed,   'netu.png']],
  init
);
