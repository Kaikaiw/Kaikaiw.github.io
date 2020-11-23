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

Resource.pauseSnd = function(key) {
  Resource.sndMap[key].pause();
  Resource.sndMap[key].currentTime = 0;
}

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
      typeof startX == 'undefined' ? this.startX : startX,
      typeof startY == 'undefined' ? this.startY : startY,
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

  renderBottom(delta, positionX, positionY) {
    ctx.drawImage(
      Resource.getPng(this.type),
      // 图片起画点
      this.startX,
      this.startY + this.sizeY * 3 / 5,
      // 大小
      this.sizeX,
      this.sizeY * 2 / 5,
      // 画哪
      positionX - (this.sizeDrawX - UNIT_WIDTH) / 2,
      positionY - (this.sizeDrawY - UNIT_HEIGHT) + this.sizeDrawY * 3 / 5,
      // 实际大小
      this.sizeDrawX,
      this.sizeDrawY * 2 / 5,
    );
  }

  renderTop(delta, positionX, positionY) {
    ctx.drawImage(
      Resource.getPng(this.type),
      // 图片起画点
      this.startX,
      this.startY,
      // 大小
      this.sizeX,
      this.sizeY * 3 / 5,
      // 画哪
      positionX - (this.sizeDrawX - UNIT_WIDTH) / 2,
      positionY - (this.sizeDrawY - UNIT_HEIGHT),
      // 实际大小
      this.sizeDrawX,
      this.sizeDrawY * 3 / 5,
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
//  障碍
// =============================================================================
class Stone extends Entity {
  constructor(x, y) {
    super();
    // 魔法数字...
    this.sprite =
        new Sprite(types.entity.stone, 64, 79, UNIT_WIDTH, UNIT_HEIGHT * 1.23);
    this.sprite.cycleTime = -1;
    this.sprite.maxCycle = 1;
  }
}

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
  constructor(id, x, y, sizeX, sizeY, playerNum) {
    super();
    this.state = new PlayerState(id, x, y, sizeX, sizeY, playerNum);
    // 魔法数字...
    this.sprite = new Sprite(playerNumToType[playerNum], 96, 118, 96, 118);
    this.sprite.maxCycle = 4;
    this.sprite.frameVector = [0,1,2,0,3];
    this.sprite.cycleTime = 170; // ms
    this.state.dir = types.dir.down;
    this.spacePressed = false;
  }

  downPlayer() {
    this.state.downPlayer();
    // 魔法数字...
    this.sprite = new Sprite(types.entity.player_downed, 75, 82, 96, 118);
    this.sprite.cycleTime = 200;
    this.sprite.maxCycle = 4;
  }

  revivePlayer() {
    this.state.revivePlayer();
    this.sprite = new Sprite(playerNumToType[this.state.playerNum], 96, 118, 96, 118);
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
    if (!this.state.downed &&
      shouldProcessSpace &&
      this.state.currentBombNumber < this.state.maxBombNumber) {
      server.volatile.emit('opcode', {o: types.opcode.put_bomb,});
      Resource.playSnd(types.sound.put_bomb);
    }

    if (Object.keys(input).length && !shouldProcessSpace) {
      input.seqId = inputSeqId++;
      server.volatile.emit('opcode', {o: types.opcode.move, i: input},);
      var localInput = Object.assign({}, input);
      localInput.delta = delta;
      this.applyInput(localInput);
      pendingInputs.push(localInput);
    }
  }

  renderBottom(delta) {
    this.sprite.renderBottom(delta, this.state.x, this.state.y);
  }

  renderTop(delta) {
    this.sprite.renderTop(delta, this.state.x, this.state.y);
  }
}
localPlayerId = '';
playerNumToType = [
  types.entity.player,
  types.entity.player2,
  types.entity.player3,
  types.entity.player4,
];

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
  constructor(id, rowId, colId, dir, len) {
    super();
    // 魔法数字...
    this.state = new EntityState(id, 0, 0);
    this.id = id;
    this.rowId = rowId;
    this.colId = colId;
    this.dir = dir;
    this.len = len;
    this.sprites = [];
    this.createTime = +new Date();
    this.ttl = 500;

    var sprite = new Sprite(types.entity.wave, UNIT_WIDTH, UNIT_HEIGHT, UNIT_WIDTH, UNIT_HEIGHT);
    sprite.cycleTime = 40;
    sprite.maxCycle = 2;
    sprite.i = rowId;
    sprite.j = colId;
    this.sprites.push(sprite);

    var directions = [ // [[step_i, step_j]]
      [-1,  0],
      [ 0,  1],
      [ 1,  0],
      [ 0, -1],
    ];
    this.direction = directions[dir - 1];
  }

  update(delta) {
    var n = this.sprites.length;
    if (n < this.len) {
      var sprite = new Sprite(types.entity.wave, UNIT_WIDTH, UNIT_HEIGHT, UNIT_WIDTH, UNIT_HEIGHT);
      sprite.cycleTime = 40;
      sprite.maxCycle = 2;
      var previous = this.sprites[n - 1];
      sprite.i = previous.i + this.direction[0];
      sprite.j = previous.j + this.direction[1];
      this.sprites.push(sprite);
    }

    for (var i in this.sprites) {
      this.sprites[i].update(delta);
    }

    var nowTs = +new Date();
    if (this.createTime + this.ttl < nowTs) {
      delete wavesClient[this.id];
    }
  }

  render(delta) {
    for (var i in this.sprites) {
      var s = this.sprites[i];
      s.renderWith(
        delta, s.j * UNIT_WIDTH, s.i * UNIT_HEIGHT, undefined, (this.dir % 4) * s.sizeY);
    }
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
mapToBGM = [
  types.sound.ship,
  types.sound.x,
  types.sound.resident,
]

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

function setPlayerPosition(player, x, y) {
  player.state.x = x;
  player.state.y = y;
  player.state.rowId = getRowID(y);
  player.state.colId = getColID(x);
}

var currentMap = 0;
function handleMessage(msg) {
  switch (msg.o) {
    case types.opcode.new_player:
      localPlayerId = msg.id;
    case types.opcode.new_map:
      stoneMatrix = clearMatrix();
      var map = maps[msg.m];
      for (var i = 0; i < MAX_ROW; i++) {
        for (var j = 0; j < MAX_COL; j++) {
          if (map[i][j] == 2) {
            stoneMatrix[i][j] = 1;
          }
        }
      }
      Resource.pauseSnd(mapToBGM[currentMap]);
      Resource.playSnd(mapToBGM[msg.m]);
      currentMap = msg.m;
    break;
    case types.opcode.move:
      for (var id in players) {
        var inRemote = false;
        for (var j in msg.p) {
          inRemote |= id == msg.p[j].id;
        }
        if (!inRemote) {
          delete players[id];
        }
      }

      for (var i in msg.p) {
        var remotePlayer = msg.p[i];
        var subState = intToPlayerState(remotePlayer.s);
        var id = remotePlayer.id;
        if (!(id in players)) { // 创建玩家
          players[id] = new Player(
            id, subState.x, subState.y, UNIT_WIDTH, UNIT_HEIGHT, subState.playerNum);
        }

        var player = players[id];

        if (id === localPlayerId) {
          setPlayerPosition(player, subState.x, subState.y);

          while (!pendingInputs.empty()) {
            var pendingInput = pendingInputs.peek();
            if (pendingInput.seqId <= remotePlayer.aid) {
              pendingInputs.shift();
            } else {
              break;
            }
          }

          player.state.speed = subState.speed;
          pendingInputs.iterate((pendingInput) => {
            player.applyInput(pendingInput);
          });
        } else {
          player.state.dir = subState.dir;
          player.state.buffer.push({'ts': +new Date(), 'x': subState.x, 'y': subState.y,});
        }

        player.state.score = subState.score;
        player.state.currentBombNumber = subState.currentBombNumber;
        player.state.maxBombNumber = subState.maxBombNumber;

        if (!player.state.downed && subState.downed) {
          player.downPlayer();
        } if (player.state.downed && !subState.downed) {
          player.revivePlayer();
        }
      }

      var bbMatrix = intArrayToMatrix(msg.bb);
      var newBombMatrix = bbMatrix[1];
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

      var waveNumber = Object.keys(wavesClient).length;
      for (var i in msg.w) {
        var remoteWave = msg.w[i];
        var subState = intToWaveState(remoteWave.s);
        wavesClient[waveNumber] = new Wave(
          waveNumber++, subState.rowId, subState.colId, subState.dir, subState.len);
      }

      boxMatrix = bbMatrix[0];
      lootMatrix = stringArrayToMatrix(msg.l);
    break;
    case types.opcode.pickup_loot:
      Resource.playSnd(types.sound.pickup_loot);
    break;
  }
}

// 享元
var block = new Block(0, 0);
var stone = new Stone(0, 0);
var box = new Box(0, -1, -1);
var bomb = new Bomb(0, -1, -1);
var loot = new Loot(0, -1, -1, 0);

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
  stoneMatrix = clearMatrix();
  bombMatrix = clearMatrix();
  lootMatrix = clearMatrix();
  waveMatrix = clearMatrix();
  playerMatrix = clearMatrix({});

  // 开始游戏
  oldTs = +new Date();
  var delta = 1000.0 / FRAME_RATE;
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

  for (var i in wavesClient) {
    wavesClient[i].render(delta);
  }

  for (var i = 0; i < MAX_ROW; i++) {
    var playersToRender = [];
    for (var j = 0; j < MAX_COL; j++) {
      if (bombMatrix[i][j]) {
        bomb.renderAt(0, j * UNIT_WIDTH, i * UNIT_HEIGHT);
      }
      for (var playerId in playerMatrix[i][j]) {
        players[playerId].renderBottom(delta);
        playersToRender.push(playerId);
      }
    }
    for (var j = 0; j < MAX_COL; j++) {
      if (boxMatrix[i][j]) {
        box.renderAt(0, j * UNIT_WIDTH, i * UNIT_HEIGHT);
      }
      if (stoneMatrix[i][j]) {
        stone.renderAt(0, j * UNIT_WIDTH, i * UNIT_HEIGHT);
      }
      if (lootMatrix[i][j]) {
        loot.renderWithAt(0, j * UNIT_WIDTH, i * UNIT_HEIGHT, (lootMatrix[i][j] - 1) * loot.sprite.sizeX, 0);
      }
    }

    for (var id in playersToRender) {
      players[playersToRender[id]].renderTop(delta);
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
  [       types.sound.ship,         'bg.ogg', 0.3, 1],
  [   types.sound.resident,   'resident.m4a', 0.3, 1],
  [          types.sound.x,          'x.m4a', 0.3, 1],
  [   types.sound.put_bomb,        'lay.wav',   1, 0],
  [    types.sound.explode,        'exp.wav',   1, 0],
  [types.sound.pickup_loot,        'loot.wav',  1, 0]
]);

Resource.loadPngs([ // [类型ID, 文件]
  [       types.entity.player,  'char4.png'],
  [       types.entity.player2, 'char2.png'],
  [       types.entity.player3, 'char3.png'],
  [       types.entity.player4, 'char1.png'],
  [         types.entity.bomb,   'bomb.png'],
  [         types.entity.wave,   'wave.png'],
  [        types.entity.block,  'block.png'],
  [        types.entity.stone,  'stone.png'],
  [          types.entity.box,    'box.png'],
  [         types.entity.loot,   'loot.png'],
  [types.entity.player_downed,   'down.png']],
  init
);
