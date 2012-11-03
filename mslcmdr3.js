// the MslCmdr namespace
var MC = { };

// for clearing the scene
THREE.Object3D.prototype.clear = function(){
    var children = this.children;
    for(var i = children.length-1;i>=0;i--){
        var child = children[i];
        child.clear();
        this.remove(child);
    };
};


$(document).ready(function() {
  var i;

  // constants
  MC.WIDTH = $('#game_container').width();
  MC.HEIGHT = $('#game_container').height();
  MC.CENTER_X = 700;
  MC.CAMERA_ORIGIN = new THREE.Vector3(MC.CENTER_X, 350, 800);
  MC.CAMERA_LOOK_AT = new THREE.Vector3(MC.CENTER_X, 200, -200);
  MC.TITLE_DURATION = 3000;
  MC.END_DURATION = 5000;

  // set up three.js basics
  MC.log('setting up three.js basics');
  MC.scene = new THREE.Scene();
  MC.camera = new THREE.PerspectiveCamera(55, MC.WIDTH / MC.HEIGHT, 1, 10000);
  MC.renderer = new THREE.WebGLRenderer({ antialias: true });
  MC.camera.position.copy(MC.CAMERA_ORIGIN);
  MC.camera.lookAt(MC.CAMERA_LOOK_AT);
  MC.renderer.setSize(MC.WIDTH, MC.HEIGHT);
  MC.renderer.setClearColorHex(0x111111, 1.0);
  $(MC.renderer.domElement).attr('id', 'game_canvas');
  $('#game_container').append(MC.renderer.domElement);

  // add lighting
  MC.ambientLight = new THREE.AmbientLight(0xdddddd);
  MC.scene.add(MC.ambientLight);

  // set up extensions: stats counter, keyboard state, click handlers
  MC.log('adding stats counter');
  MC.stats = new Stats();
  $('#perf_stats').append(MC.stats.domElement);
  MC.keyboard = new THREEx.KeyboardState();

  // create the game state stack
  MC.stateStack = new Array();
  MC.stateStack.push(new MC.TitleState());
  MC.stateStack[MC.stateStack.length-1].activate();

  // grab the level descriptions
  $.ajax({
    url: 'level_desc.json',
    dataType: 'text',
    async: false
  }).done(function(resp) {
    MC.levels = JSON.parse(resp).levels;
  });

  // DEBUG: add mousemove scene scrolling
  // add to game_container so that scroll works with overlays
  $('#game_container').mousemove(function(evt) {
    var rect = MC.renderer.domElement.getBoundingClientRect();
    var x = evt.clientX - rect.left;
    var y = evt.clientY - rect.top;
    var pctX = (x - (MC.WIDTH / 2)) / (MC.WIDTH / 2);
    var pctY = (y - (MC.HEIGHT / 2)) / (MC.HEIGHT / 2);
    var camOffsetX = pctX * 50;
    var camOffsetY = pctY * 20;
    MC.camera.position.set(camOffsetX, camOffsetY, 0);
    MC.camera.position.addSelf(MC.CAMERA_ORIGIN);
    MC.camera.lookAt(MC.CAMERA_LOOK_AT);
  });
  $("#game_container").noContext();

  MC.lastTime = Date.now();
  MC.update();
});

MC.update = function() {
  var nStates;
  var currentTime = Date.now();
  var elapsed = currentTime - MC.lastTime;
  MC.lastTime = currentTime;

  // DEBUG cam movement
  if(MC.keyboard.pressed('w')) {
    MC.camera.position.z -= 5;
  } else if(MC.keyboard.pressed('s')) {
    MC.camera.position.z += 5;
  } else if(MC.keyboard.pressed('a')) {
    MC.camera.position.x -= 5;
  } else if(MC.keyboard.pressed('d')) {
    MC.camera.position.x += 5;
  } else if(MC.keyboard.pressed('up')) {
    MC.camera.position.y += 5;
  } else if(MC.keyboard.pressed('down')) {
    MC.camera.position.y -= 5;
  }
  MC.debug('cam.pos=', MC.camera.position.x, MC.camera.position.y, MC.camera.position.z);

  // update game and render
  nStates = MC.stateStack.length;
  if(nStates > 0) {
    MC.stateStack[nStates-1].update(elapsed);
    MC.renderer.render(MC.scene, MC.camera);
    MC.stats.update();
    requestAnimationFrame(MC.update);
  } else {
    MC.log("ERROR: no more states :(");
  }
};

MC.log = function(msg) {
  console.log('MC: ' + msg);
};

MC.debug = function(msg, val1, val2, val3) {
  $('#debug_text').text('DEBUG: ' + msg +
    '[' + val1.toFixed(3) + ', ' + val2.toFixed(3) + ', ' + val3.toFixed(3) + ']');
};


/****************
 * TitleState
 ****************/
MC.TitleState = function() {
};

MC.TitleState.prototype.activate = function() {
  var i, topOffset, leftOffset, children;

  MC.log('activating TitleState');
  $('#score').hide();

  // set up the scene
  // MC.scene.clear();
  MC.ground = new MC.Ground();
  MC.cities = new Array(5);
  for(i = 0; i < 5; i++) {
    MC.cities[i] = new MC.City(i);
  }
  MC.bases = new Array();
  MC.bases.push(new MC.Base('left'));
  MC.bases.push(new MC.Base('right'));

  // create the title spans
  $('#text_overlay').empty();
  $('#text_overlay').append(
    '<span class="title_overlay">M</span>' +
    '<span class="title_overlay">s</span>' +
    '<span class="title_overlay">l</span>' +
    '<span class="title_overlay">C</span>' +
    '<span class="title_overlay">m</span>' +
    '<span class="title_overlay">d</span>' +
    '<span class="title_overlay">r</span>' +
    '<span class="title_overlay" last="true">3</span>' +
    '<br />' +
    '<span id="title_overlay_subtitle">' +
    '<span class="title_overlay_small">C</span>' +
    '<span class="title_overlay_small">l</span>' +
    '<span class="title_overlay_small">i</span>' +
    '<span class="title_overlay_small">c</span>' +
    '<span class="title_overlay_small">k</span>' +
    '<span class="title_overlay_small">&nbsp;</span>' +
    '<span class="title_overlay_small">T</span>' +
    '<span class="title_overlay_small">o</span>' +
    '<span class="title_overlay_small">&nbsp;</span>' +
    '<span class="title_overlay_small">S</span>' +
    '<span class="title_overlay_small">t</span>' +
    '<span class="title_overlay_small">a</span>' +
    '<span class="title_overlay_small">r</span>' +
    '<span class="title_overlay_small">t</span>' +
    '</span>');
  $('.title_overlay').css({
    'margin-left': '8px',
    'margin-right': '8px',
    'font-size': '64pt',
    'font-family': '"Century Gothic", CenturyGothic, AppleGothic, sans-serif',
    'color': 'red',
    'text-shadow': '0 0 0.2em #f00, 0 0 0.8em #f00'
  });

  $('.title_overlay_small').css({
    'margin-left': '2px',
    'margin-right': '2px',
    'font-size': '24pt',
    'font-family': '"Century Gothic", CenturyGothic, AppleGothic, sans-serif',
    'color': 'red'
  });

  // set title position
  topOffset = (MC.HEIGHT - $('#text_overlay').height()) / 2;
  leftOffset = (MC.WIDTH - $('#text_overlay').width()) / 2;
  $('#text_overlay').css({
    'top': topOffset + 'px',
    'left': leftOffset + 'px'
  });
  leftOffset = ($('#text_overlay').width() - $('#title_overlay_subtitle').width()) / 2;
  $('#title_overlay_subtitle').css({ 'margin-left': leftOffset + 'px' });

  // add chained fade-ins on title letters
  $('.title_overlay,.title_overlay_small').css('display', 'none');
  $('.title_overlay').delay(800).each(function(idx) {
    $(this).delay(idx * 200).fadeIn(2000, function() {
      if($(this).attr('last') == 'true') {
        $('.title_overlay_small').delay(500).fadeIn(2000);
      }
    });
  });

  // add click event handler, disable text selector
  $("#game_container").bind('mousedown', this.onclick);
  $('#text_overlay').find('*').css('cursor', 'default');
};

MC.TitleState.prototype.deactivate = function() {
  MC.log('deactivating TitleState');
  $('#text_overlay').hide();
  $('#text_overlay').empty();
  $("#game_container").unbind('mousedown', this.onclick);
};

MC.TitleState.prototype.onclick = function(evt) {
  MC.stateStack[MC.stateStack.length-1].deactivate();
  MC.stateStack.push(new MC.PlayState());
  MC.stateStack[MC.stateStack.length-1].activate();
  return false;
};

MC.TitleState.prototype.update = function(elapsed) {
  // waiting for click; nothing to do here
};


/****************
 * PlayState
 ****************/
MC.PlayState = function() {
  var state = this;
  this.level = 0;

  MC.log('state.level=' + state.level);
  this.Loops = {
    TitleLoop: {
      elapsed: 0,
      init: function() {
        var topOffset, leftOffset;
        $('#text_overlay').empty();
        $('#text_overlay').attr('style', '');
        $('#text_overlay').append(MC.levels[state.level].title);
        $('#text_overlay').css({
          'font-size': '32pt',
          'font-family': '"Century Gothic", CenturyGothic, AppleGothic, sans-serif',
          'color': 'red',
          'text-shadow': '0 0 0.2em #f00, 0 0 0.8em #f00'
        });
        topOffset = (MC.HEIGHT - $('#text_overlay').height()) / 2;
        leftOffset = (MC.WIDTH - $('#text_overlay').width()) / 2;
        $('#text_overlay').css({
          'top': topOffset + 'px',
          'left': leftOffset + 'px'
        });
        $('#text_overlay').find('*').css('cursor', 'default');
      }
    },
    PlayLoop: {
      elapsed: 0,
      wave: 0,
      waveProgress: 0,
      rateProgress: 0,
      rateElapsed: 0,
      init: function() {
        $('#text_overlay').empty();
      }
    },
    EndLoop: {
      elapsed: 0,
      init: function() {
        var topOffset, leftOffset;
        $('#text_overlay').empty();
        $('#text_overlay').attr('style', '');
        $('#text_overlay').append(MC.levels[state.level].end_text);
        $('#text_overlay').css({
          'font-size': '32pt',
          'font-family': '"Century Gothic", CenturyGothic, AppleGothic, sans-serif',
          'color': 'red',
          'text-shadow': '0 0 0.2em #f00, 0 0 0.8em #f00'
        });
        topOffset = (MC.HEIGHT - $('#text_overlay').height()) / 2;
        leftOffset = (MC.WIDTH - $('#text_overlay').width()) / 2;
        $('#text_overlay').css({
          'top': topOffset + 'px',
          'left': leftOffset + 'px'
        });
        $('#text_overlay').find('*').css('cursor', 'default');
      }
    }
  };

  // set up bookkeeping
  this.currentLoop = this.Loops.TitleLoop;
  this.currentLoop.init();

  // score
  this.score = 0;
  $('#score').show();
  this.addScore(0);
};

MC.PlayState.prototype.activate = function() {
  MC.log('activating PlayState');

  // add click event handler
  $("#game_canvas").bind('mousedown', this.onclick);
};

MC.PlayState.prototype.deactivate = function() {
  MC.log('deactivating PlayState');
  $("#game_canvas").unbind('mousedown', this.onclick);
  $('#score').hide();
};

MC.PlayState.prototype.onclick = function(evt) {
  var state = MC.stateStack[MC.stateStack.length-1];

  switch(state.currentLoop) {
    case state.Loops.TitleLoop:
      state.setLoop(state.Loops.PlayLoop);
      break;
    case state.Loops.PlayLoop:
      // handle new missile
      break;
    case state.Loops.EndLoop:
      // handle new missile
      break;

  }

  // handle new missile
  return false;
};

MC.PlayState.prototype.update = function(elapsed) {
  this.currentLoop.elapsed += elapsed;
  switch(this.currentLoop) {
    case this.Loops.TitleLoop:
      // end TitleLoop?
      if(this.currentLoop.elapsed > MC.TITLE_DURATION) {
        this.setLoop(this.Loops.PlayLoop);
      }
      break;
    case this.Loops.PlayLoop:
      if(this.currentLoop.elapsed > 5000) {
        this.setLoop(this.Loops.EndLoop);
      }
      break;
    case this.Loops.EndLoop:
      // end EndLoop?
      if(this.currentLoop.elapsed > MC.END_DURATION) {
        if(this.level >= (MC.levels.length-1)) {
          // no more levels, pop PlayState, leaves us with title state
          MC.stateStack[MC.stateStack.length-1].deactivate();
          MC.stateStack.pop();
          MC.stateStack[MC.stateStack.length-1].activate();
        } else {
          // move along to next level in PlayState
          this.level++;
          this.setLoop(this.Loops.TitleLoop);
        }
      }
      break;
  }
};

MC.PlayState.prototype.addScore = function(points) {
  this.score += points;
  $('#score').text('Score: ' + this.score);
};

MC.PlayState.prototype.setLoop = function(loop) {
  // reset properties
  for(var key in this.Loops) {
    if(this.Loops.hasOwnProperty(key)) {
      var obj = this.Loops[key];
      for(var prop in obj) {
        if(obj.hasOwnProperty(prop)) {
          if(typeof(obj[prop]) == "number") {
            obj[prop] = 0;
          }
        }
      }
    }
  }
  // set current loop
  this.currentLoop = loop;
  this.currentLoop.init();
};



/****************
 * WinState
 ****************/


/****************
 * LoseState
 ****************/


/****************
 * Ground
 ****************/
MC.Ground = function() {
  // load texture
  var groundTexture = THREE.ImageUtils.loadTexture("img/ground_texture.png");
  groundTexture.wrapS = THREE.RepeatWrapping;
  groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.anisotropy = 16;
  groundTexture.repeat.set(7, 3);
  this.material = new THREE.MeshPhongMaterial({
    map: groundTexture,
    color: 0x00ff00,
    ambient: 0x00ff00,
    shading: THREE.SmoothShading
  });

  // create mesh
  this.geometry = new THREE.CubeGeometry(MC.CENTER_X * 2, 25, 200);
  this.mesh = new THREE.Mesh(this.geometry, this.material);
  this.mesh.translateX(MC.CENTER_X);
  this.mesh.translateY(-12.5);
  MC.scene.add(this.mesh);
};

MC.Ground.prototype.removeSelf = function() {
  MC.scene.remove(this.mesh);
};


/****************
 * Cities
 ****************/
MC.City = function(pos) {
  var buildingTexture = THREE.ImageUtils.loadTexture("img/building_texture.png");
  buildingTexture.wrapS = THREE.RepeatWrapping;
  buildingTexture.wrapT = THREE.RepeatWrapping;
  buildingTexture.anisotropy = 16;
  this.material = new THREE.MeshPhongMaterial({
    map: buildingTexture,
    color: 0xffffff,
    ambient: 0xaaaaaa,
    shading: THREE.SmoothShading
  });

  this.centerX = 300 + (200 * pos);
  this.geometry = new THREE.CubeGeometry(50, 100, 50);
  this.mesh = new THREE.Mesh(this.geometry, this.material);
  this.mesh.position.set(this.centerX, 50, 0);
  MC.scene.add(this.mesh);
};

MC.City.prototype.removeSelf = function() {
  MC.scene.remove(this.mesh);
};


/****************
 * Bases
 ****************/
MC.Base = function(which) {
  if(which == 'left') {
    this.centerX = 50;
  } else if(which == 'right') {
    this.centerX = (MC.CENTER_X * 2) - 50;
  }
  this.geometry = new THREE.SphereGeometry(50, 16, 16,
    0, Math.PI * 2,
    0, Math.PI / 2);
  this.material = new THREE.MeshBasicMaterial({
    color: 0x2222aa
  });
  this.mesh = new THREE.Mesh(this.geometry, this.material);
  this.mesh.position.set(this.centerX, 0, 0);
  MC.scene.add(this.mesh);
};

MC.Base.prototype.removeSelf = function() {
  MC.scene.remove(this.mesh);
};


/****************
 * Missiles
 ****************/


/****************
 * Explosions
 ****************/
