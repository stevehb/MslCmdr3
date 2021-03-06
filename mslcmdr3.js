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

  // grab settings
  $.ajax({
    async: false, cached: false, dataType: 'text',
    url: 'settings.json'
  }).done(function(resp) {
    MC.settings = JSON.parse(resp).settings;
    MC.settings.screen_width = $('#game_container').width();
    MC.settings.screen_height = $('#game_container').height();
    if(typeof(MC.settings.explosion_color) == 'string') {
      MC.settings.explosion_color = parseInt(MC.settings.explosion_color, 16);
    }
  });

  // load the shaders
  MC.shaders = [];
  $.ajax({
    async: false, cached: false, dataType: 'text',
    url: 'explosion_shader.vert'
  }).done(function(resp) {
    MC.shaders['explosion_shader_vert'] = resp;
  });
  $.ajax({
    async: false, cached: false, dataType: 'text',
    url: 'explosion_shader.frag'
  }).done(function(resp) {
    MC.shaders['explosion_shader_frag'] = resp;
  });

  // program constants
  MC.camera_origin = new THREE.Vector3(MC.settings.world_center_x, 500, 1000);
  MC.camera_look_at = new THREE.Vector3(MC.settings.world_center_x, 350, -200);

  // set up three.js basics
  var aspectRatio = MC.settings.screen_width / MC.settings.screen_height;
  MC.scene = new THREE.Scene();
  MC.camera = new THREE.PerspectiveCamera(55, aspectRatio, 1, 10000);
  MC.renderer = new THREE.WebGLRenderer({ antialias: true });
  MC.camera.position.copy(MC.camera_origin);
  MC.camera.lookAt(MC.camera_look_at);
  MC.renderer.setSize(MC.settings.screen_width, MC.settings.screen_height);
  MC.renderer.setClearColorHex(0x111111, 1.0);
  $(MC.renderer.domElement).attr('id', 'game_canvas');
  $('#game_container').append(MC.renderer.domElement);

  // handle window resizing
  $(window).resize(function(evt) {
    MC.settings.screen_width = $('#game_container').width();
    MC.settings.screen_height = $('#game_container').height();

    // update the renderer and camera for the new size
    MC.renderer.setSize(MC.settings.screen_width, MC.settings.screen_height);
    MC.camera.aspect = MC.settings.screen_width / MC.settings.screen_height;
    MC.camera.updateProjectionMatrix();
  });

  // set up extensions: stats counter, keyboard state, click handlers
  MC.stats = new Stats();
  $('#perf_stats').append(MC.stats.domElement);
  MC.keyboard = new THREEx.KeyboardState();

  // create the game state stack
  MC.stateStack = new Array();
  MC.stateStack.push(new MC.TitleState());
  MC.stateStack[MC.stateStack.length-1].activate();

  // add to game_container so that scroll works with overlays
  $('#game_container').bind('mousemove', function(evt) {
    var rect = MC.renderer.domElement.getBoundingClientRect();
    var x = evt.clientX - rect.left;
    var y = evt.clientY - rect.top;
    var pctX = (x - (MC.settings.screen_width / 2)) / (MC.settings.screen_width / 2);
    var pctY = (y - (MC.settings.screen_height / 2)) / (MC.settings.screen_height / 2);
    var camOffsetX = pctX * 80;
    var camOffsetY = pctY * 40;
    MC.camera.position.set(camOffsetX, camOffsetY, 0);
    MC.camera.position.addSelf(MC.camera_origin);
    MC.camera.lookAt(MC.camera_look_at);
  });
  $("#game_container").noContext();

  MC.lastTime = Date.now();
  MC.update();
});

MC.update = function() {
  var currentTime = Date.now();
  var elapsed = currentTime - MC.lastTime;
  MC.lastTime = currentTime;

  // DEBUG cam movement
  if(MC.keyboard.pressed('w')) { MC.camera.position.z -= 5; }
  if(MC.keyboard.pressed('s')) { MC.camera.position.z += 5; }
  if(MC.keyboard.pressed('a')) { MC.camera.position.x -= 5; }
  if(MC.keyboard.pressed('d')) { MC.camera.position.x += 5; }
  if(MC.keyboard.pressed('up')) { MC.camera.position.y += 5; }
  if(MC.keyboard.pressed('down')) { MC.camera.position.y -= 5; }

  // update game and render
  var nStates = MC.stateStack.length;
  if(nStates > 0) {
    MC.stateStack[nStates-1].update(elapsed);
    MC.renderer.render(MC.scene, MC.camera);
    MC.stats.update();
    TWEEN.update(currentTime);
    requestAnimationFrame(MC.update);
  } else {
    MC.log("ERROR: no more states :(");
  }
};

MC.getCanvasCoords = function(evt) {
  var bb = $('#game_canvas')[0].getBoundingClientRect();
  return {
    x: (evt.clientX - bb.left),
    y: (evt.clientY - bb.top)
  };
}

MC.addScoreOverlay = function(x, y, msg) {
  // create new elem and position
  var randStr = Math.random().toString(36).substring(2);
  var randId = '#' + randStr;
  $('<div />', {
    'class': 'text_overlay',
    'font-family': '"Cousine", sans-serif',
    'id': randStr,
    'text': msg
  }).appendTo('#game_container');
  var elemWidth = $(randId).width();
  var elemHeight = $(randId).height();
  $(randId).css({
    'color': 'yellow',
    'text-shadow': '0 0 0.2em #ff0, 0 0 0.8em #ff0',
    'cursor': 'default',
    'left': x - (elemWidth / 2),
    'top': y - (elemHeight / 2)
  })

  // add fade & rise, using tween
  var top = $(randId).offset().top;
  var tween = new TWEEN.Tween({ opacity: 1.0, posY: top });
  tween.to({ opacity: 0.0, posY: top - elemHeight }, MC.settings.explosion_duration / 4);
  tween.easing(TWEEN.Easing.Exponential.In);
  tween.onUpdate(function() {
    $(randId).fadeTo(0, this.opacity);
    $(randId).css({ top: this.posY });
  });
  tween.onComplete(function() {
    $(randId).remove();
  });
  tween.start();
}

// get random int between min and max inclusive
MC.getRandomInt = function(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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
  var i, children;

  MC.log('activating TitleState');
  $('#score').hide();

  // set up the demo scene
  MC.scene.clear();
  MC.ground = new MC.Ground();
  MC.cities = new Array(5);
  for(i = 0; i < 5; i++) {
    MC.cities[i] = new MC.City(i);
  }
  MC.bases = new Array();
  MC.bases.push(new MC.Base('left'));
  MC.bases.push(new MC.Base('right'));
  MC.ambientLight = new THREE.AmbientLight(0xaaaaaa);
  MC.scene.add(MC.ambientLight);

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
    'color': 'red',
    'text-shadow': '0 0 0.2em #000, 0 0 0.8em #f00'
  });

  $('.title_overlay_small').css({
    'margin-left': '2px',
    'margin-right': '2px',
    'font-size': '24pt',
    'color': 'red',
    'text-shadow': '0 0 0'
  });
  this.centerTitle();

  // add chained fade-ins on title letters
  $('.title_overlay,.title_overlay_small').css('display', 'none');
  $('.title_overlay').delay(800).each(function(idx) {
    $(this).delay(idx * 200).fadeIn(2000, function() {
      if($(this).attr('last') == 'true') {
        $('.title_overlay_small').delay(500).fadeIn(2000);
      }
    });
  });

  // add click/resize event handlers, disable text selector
  $('#game_container').bind('mousedown', this.onclick);
  $(window).bind('resize', this.centerTitle);
  $('#text_overlay').find('*').css('cursor', 'default');
};

MC.TitleState.prototype.deactivate = function() {
  MC.log('deactivating TitleState');
  $('#text_overlay').hide();
  $('#text_overlay').empty();
  $('#game_container').unbind('mousedown', this.onclick);
  $(window).unbind('resize', this.centerTitle);
};

MC.TitleState.prototype.centerTitle = function() {
  // set title position
  var topOffset = (MC.settings.screen_height - $('#text_overlay').height()) / 2;
  var leftOffset = (MC.settings.screen_width - $('#text_overlay').width()) / 2;
  $('#text_overlay').css({
    'top': topOffset + 'px',
    'left': leftOffset + 'px'
  });
  leftOffset = ($('#text_overlay').width() - $('#title_overlay_subtitle').width()) / 2;
  $('#title_overlay_subtitle').css({ 'margin-left': leftOffset + 'px' });
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

  // grab the level descriptions
  $.ajax({
    async: false,
    cached: false,
    dataType: 'text',
    url: 'level_desc.json'
  }).done(function(resp) {
    state.levels = JSON.parse(resp).levels;
  });
  this.level = 0;

  // for transforming 2d click to 3d position
  this.mouse2d = new THREE.Vector3(0, 0, 0.5);
  this.mouse3d = new THREE.Vector3(0, 0, 0);

  // set up the play scene
  MC.missiles = new Array();
  MC.scene.clear();
  MC.ground = new MC.Ground();
  MC.cities = new Array(5);
  for(i = 0; i < 5; i++) {
    MC.cities[i] = new MC.City(i);
  }
  MC.bases = {
    left: new MC.Base('left'),
    right: new MC.Base('right')
  };
  MC.ambientLight = new THREE.AmbientLight(0xaaaaaa);
  MC.scene.add(MC.ambientLight);

  // loops to move logic through title --> play --> end
  MC.log('state.level=' + state.level);
  this.Loops = {
    TitleLoop: {
      elapsed: 0,
      init: function() {
        var topOffset, leftOffset;
        $('#text_overlay').empty();
        $('#text_overlay').attr('style', '');
        $('#text_overlay').append(state.levels[state.level].title);
        $('#text_overlay').css({
          'font-size': '32pt',
          'color': 'red',
          'text-shadow': '0 0 0.2em #f00, 0 0 0.8em #f00'
        });
        topOffset = (MC.settings.screen_height - $('#text_overlay').height()) / 2;
        leftOffset = (MC.settings.screen_width - $('#text_overlay').width()) / 2;
        $('#text_overlay').css({
          'top': topOffset + 'px',
          'left': leftOffset + 'px'
        });
        $('#text_overlay').find('*').css('cursor', 'default');
      }
    },
    PlayLoop: {
      elapsed: 0,
      levelProgress: 0,
      playFinished: false,
      enemyMissilePause: 0,
      enemyMissileElapsed: 0,
      levelMissileTypes: [],
      init: function() {
        $('#text_overlay').empty();
        this.initLevel();
      },
      initLevel: function() {
        this.levelProgress = 0;
        this.playFinished = false;
        this.enemyMissileElapsed = 0;
        this.enemyMissilePause = 1000 / state.levels[state.level].missile_rate_per_sec;
        this.missileTypes = state.levels[state.level].missile_types.split(',');
      },
      getType: function() {
        // get integer index between [0 - this.missileTypes.length);
        var idx = MC.getRandomInt(0, this.missileTypes.length-1);
        return this.missileTypes[idx];
      }
    },
    EndLoop: {
      elapsed: 0,
      endGame: false,
      init: function() {
        this.elapsed = 0;
        this.endGame = false;
        // determine ending text
        var remainingCities = 0;
        for(i = 0; i < MC.cities.length; i++) {
          remainingCities += MC.cities[i].isActive ? 1 : 0;
        }
        var endText = state.levels[state.level].default_end_text;
        this.endGame = (remainingCities == 0) || (state.level >= state.levels.length-1);
        if(this.endGame && remainingCities == 0) {
          endText = MC.settings.lose_text;
        } else if(this.endGame) {
          endText = MC.settings.win_text;
        }
        MC.log('setting EndLoop.endGame=' + this.endGame);

        // format, center, and display end text
        var topOffset, leftOffset;
        $('#text_overlay').empty();
        $('#text_overlay').attr('style', '');
        $('#text_overlay').append(endText);
        $('#text_overlay').css({
          'font-size': '32pt',
          'color': 'red',
          'text-shadow': '0 0 0.2em #f00, 0 0 0.8em #f00'
        });
        topOffset = (MC.settings.screen_height - $('#text_overlay').height()) / 2;
        leftOffset = (MC.settings.screen_width - $('#text_overlay').width()) / 2;
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

  // score, win/lose/draw
  this.score = 0;
  $('#score').show();
  this.addScore(0);
};

MC.PlayState.prototype.activate = function() {
  MC.log('activating PlayState');

  // add click event handler
  $('#game_canvas').bind('mousedown', this.onclick);
};

MC.PlayState.prototype.deactivate = function() {
  MC.log('deactivating PlayState');
  $('#game_canvas').unbind('mousedown', this.onclick);
  $('#score').hide();
};

MC.PlayState.prototype.update = function(elapsed) {
  var i, j;
  this.currentLoop.elapsed += elapsed;
  switch(this.currentLoop) {
    case this.Loops.TitleLoop:
      var endLoop = this.currentLoop;
      // end TitleLoop?
      if(endLoop.elapsed > MC.settings.level_title_duration) {
        this.setCurrentLoop(this.Loops.PlayLoop);
      }
      break;

    case this.Loops.PlayLoop:
      var playLoop = this.currentLoop;
      // check enemy missile launch status
      playLoop.enemyMissileElapsed += elapsed;
      var enemyMslReady = playLoop.enemyMissileElapsed > playLoop.enemyMissilePause;
      if(enemyMslReady && !playLoop.playFinished) {
        var opts = {
          team: 'enemy',
          type: playLoop.getType(),
          speed: this.levels[this.level].missile_speed,
          color: this.levels[this.level].missile_color
        };
        MC.Missile.createNew(opts);

        // update level progress
        if(this.levels[this.level].limit_type == 'count') {
          playLoop.levelProgress++;
        } else if(this.levels[this.level].limit_type == 'time') {
          playLoop.levelProgress += playLoop.enemyMissilePause;
        }
        playLoop.enemyMissileElapsed -= playLoop.enemyMissilePause;
      }

      // update all missiles
      var hasActiveEnemyMsl = false;
      for(i = 0; i < MC.missiles.length; i++) {
        MC.missiles[i].update(elapsed);
        hasActiveEnemyMsl = hasActiveEnemyMsl ||
            (MC.missiles[i].isActive && MC.missiles[i].team == 'enemy');
      }

      // check enemy missiles for hitting an explosion
      for(i = 0; i < MC.missiles.length; i++) {
        var isEnemy = MC.missiles[i].team == 'enemy';
        var isMissile = MC.missiles[i].isMissile;
        if(isEnemy && isMissile) {
          for(j = 0; j < MC.missiles.length; j++) {
            if(i != j && MC.missiles[j].isExplosion) {
              var enemyMsl = MC.missiles[i];
              var expl = MC.missiles[j];
              var distSqr = enemyMsl.pos.distanceToSquared(expl.pos);
              var explRad = MC.settings.explosion_radius * MC.missiles[j].explScale;
              if(distSqr <= (explRad * explRad)) {
                var points = this.levels[this.level].point_value;
                // convert missile to explosion, add score
                enemyMsl.isMissile = false;
                enemyMsl.explChain = expl.explChain + 1;
                this.addScore(points * (enemyMsl.explChain + 1));
                //console.log('enemyMsl=%o', enemyMsl);
                var coords = MC.ground.project(enemyMsl.pos);
                var msg = (enemyMsl.explChain == 1) ? points.toString() : 'X ' + enemyMsl.explChain;
                MC.addScoreOverlay(coords.x, coords.y, msg);
              }
            }
          }
        }
      }

      // make sure cities still exist
      var hasCities = false;
      for(i = 0; i < MC.cities.length; i++) {
        hasCities = hasCities || MC.cities[i].isActive;
      }
      if(!hasCities) {
        playLoop.playFinished = true;
        playLoop.levelProgress = this.levels[this.level].limit + 1;
      }

      // check level state, wait for missiles to finish
      if(playLoop.levelProgress > this.levels[this.level].limit) {
        playLoop.playFinished = true;
        if(!hasActiveEnemyMsl) {
          this.setCurrentLoop(this.Loops.EndLoop);
        }
      }
      break;

    case this.Loops.EndLoop:
      var endLoop = this.currentLoop;
      // end EndLoop?
      if(endLoop.elapsed > MC.settings.level_end_text_duration) {
        // endGame previously set in endLoop.init()
        if(endLoop.endGame) {
          // no more levels, pop PlayState, leaves us with title state
          MC.stateStack[MC.stateStack.length-1].deactivate();
          MC.stateStack.pop();
          MC.stateStack[MC.stateStack.length-1].activate();
        } else {
          // move along to next level in PlayState
          this.level++;
          this.setCurrentLoop(this.Loops.TitleLoop);
        }
      }
      break;
  }
};

MC.PlayState.prototype.onclick = function(evt) {
  var state = MC.stateStack[MC.stateStack.length-1];
  var i;
  switch(state.currentLoop) {
    case state.Loops.TitleLoop:
      state.setCurrentLoop(state.Loops.PlayLoop);
      break;
    case state.Loops.PlayLoop:
      // calc world space coord of mouse click
      var click = MC.getCanvasCoords(evt);
      state.mouse2d.setX(((click.x / MC.settings.screen_width) * 2) - 1);
      state.mouse2d.setY(((click.y / MC.settings.screen_height) * -2) + 1);
      var mslDest = MC.ground.unproject(state.mouse2d.x, state.mouse2d.y);

      // did user click over battlefield?
      var clickInBattlefield = false;
      clickInBattlefield =
        mslDest != null &&
        mslDest.x >= 0 &&
        mslDest.x <= (MC.settings.world_center_x * 2) &&
        mslDest.y >= MC.settings.city_height;

      // if so, launch a missile
      if(clickInBattlefield) {
        var side = (evt.which == 1) ? 'left' : 'right';
        var opts = { team: 'player', type: 'icbm', side: side, dest: mslDest };
        MC.Missile.createNew(opts);
      }
      break;
    case state.Loops.EndLoop:
      state.currentLoop.elapsed = MC.settings.level_end_text_duration + 1;
      break;
  }
  return false;
};

MC.PlayState.prototype.addScore = function(points) {
  this.score += points;
  $('#score').text('Score: ' + this.score);
};

MC.PlayState.prototype.setCurrentLoop = function(loop) {
  // reset properties
  for(var key in this.Loops) {
    if(this.Loops.hasOwnProperty(key)) {
      var obj = this.Loops[key];
      for(var prop in obj) {
        if(obj.hasOwnProperty(prop)) {
          if(typeof(obj[prop]) == "number") {
            obj[prop] = 0;
          } else if(typeof(obj[prop] == "string")) {
            // we should clear strings, but this also clears functions
            //obj[prop] = '';
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
  this.material = new THREE.MeshLambertMaterial({
    map: groundTexture,
    color: 0x00ff00,
    ambient: 0x00ff00,
    shading: THREE.SmoothShading
  });

  // create mesh
  this.geometry = new THREE.CubeGeometry(MC.settings.world_center_x * 2, 25, 200);
  this.mesh = new THREE.Mesh(this.geometry, this.material);
  this.mesh.translateX(MC.settings.world_center_x);
  this.mesh.translateY(-12.5);
  MC.scene.add(this.mesh);

  // picking plane is used for click detection
  var pickGeom = new THREE.PlaneGeometry(MC.settings.world_center_x * 2, 2000);
  var pickMat = new THREE.MeshBasicMaterial({
    wireframe: true,
    transparent: true,
    color: 0x000000,
    opacity: 0 });
  this.pickingPlane = new THREE.Mesh(pickGeom, pickMat);
  this.pickingPlane.translateX(MC.settings.world_center_x);
  this.pickingPlane.translateY(500);
  MC.scene.add(this.pickingPlane);

  // for unproject()
  this.projector = new THREE.Projector();
  this.point2d = new THREE.Vector3(0, 0, 0.5);
};

MC.Ground.prototype.unproject = function(x, y) {
  this.point2d.x = x;
  this.point2d.y = y;
  var ray = this.projector.pickingRay(this.point2d, MC.camera);
  var intersectors = ray.intersectObject(this.pickingPlane);

  // if use clicked over the battlefield, then add a missile
  if(intersectors.length > 0) {
    return intersectors[0].point;
  } else {
    console.log('no intersectors: ray=%o', ray);
    MC.ray = ray;
    return null;
  }
};

MC.Ground.prototype.project = function(pos) {
  var scrCoords = this.projector.projectVector(pos.clone(), MC.camera);
  var halfWidth = MC.settings.screen_width / 2;
  var halfHeight = MC.settings.screen_height / 2;
  return {
    x: (scrCoords.x * halfWidth) + halfWidth,
    y: (-scrCoords.y * halfHeight) + halfHeight
  }
}

MC.Ground.prototype.removeSelf = function() {
  MC.scene.remove(this.mesh);
};


/****************
 * Cities
 ****************/
MC.City = function(pos) {
  this.isActive = true;

  // create city texture
  var buildingTexture = THREE.ImageUtils.loadTexture("img/building_texture.png");
  buildingTexture.wrapS = THREE.RepeatWrapping;
  buildingTexture.wrapT = THREE.RepeatWrapping;
  buildingTexture.anisotropy = 16;
  this.material = new THREE.MeshLambertMaterial({
    map: buildingTexture,
    color: 0xffffff,
    ambient: 0xaaaaaa,
    shading: THREE.SmoothShading
  });

  // set up city geometry
  this.centerX = 300 + (200 * pos);
  this.height = MC.settings.city_height;
  this.geometry = new THREE.CubeGeometry(50, this.height, 50);
  this.mesh = new THREE.Mesh(this.geometry, this.material);
  this.mesh.position.set(this.centerX, this.height / 2, 0);
  MC.scene.add(this.mesh);
};

MC.City.prototype.hit = function() {
  // set up explosion mesh
  this.isActive = false;
  this.removeSelf();
  var explRad = MC.settings.explosion_radius * 1.5;
  var explColor = parseInt(MC.settings.explosion_color, 16);
  this.geometry = new THREE.SphereGeometry(MC.settings.explosion_radius * 2, 16, 16,
    0, Math.PI * 2,
    0, Math.PI / 2);
  this.material = new THREE.MeshLambertMaterial({ color: explColor });
  this.mesh = new THREE.Mesh(this.geometry, this.material);
  this.mesh.position.set(this.centerX, 0, 0);
  MC.scene.add(this.mesh);

  // set up fade tween
  var thisCity = this;
  this.explFadeTween = new TWEEN.Tween({ opacity: 1.0 });
  this.explFadeTween.to({ opacity: 0.0 }, MC.settings.explosion_duration * 2);
  this.explFadeTween.easing(TWEEN.Easing.Circular.In);
  this.explFadeTween.onUpdate(function() {
    thisCity.material.opacity = this.opacity;
  });
  this.explFadeTween.onComplete(function() {
    thisCity.removeSelf();
    thisCity.geometry = null;
    thisCity.material = null;
    thisCity.mesh = null;
  });
  this.explFadeTween.start();
};

MC.City.prototype.removeSelf = function() {
  MC.scene.remove(this.mesh);
  this.geometry = null;
  this.material = null;
  this.mesh = null;
};

MC.City.getActive = function() {
  var i;
  var idxs = [];
  for(i = 0; i < MC.cities.length; i++) {
    if(MC.cities[i].isActive) {
      idxs.push(i);
    }
  }
  if(idxs.length == 0) {
    return null;
  } else {
    return idxs[MC.getRandomInt(0, idxs.length-1)];
  }
}


/****************
 * Bases
 ****************/
MC.Base = function(which) {
  if(which == 'left') {
    this.centerX = MC.settings.base_height;
  } else if(which == 'right') {
    this.centerX = (MC.settings.world_center_x * 2) - MC.settings.base_height;
  }
  this.geometry = new THREE.SphereGeometry(MC.settings.base_height, 16, 16,
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
MC.Missile = function(opts) {
  this.reset(opts);
};

MC.Missile.createNew = function(opts) {
  // recycle old missile if possible, otherwise create a new one
  var mslAdded = false;
  for(i = 0; i < MC.missiles.length; i++) {
    if(!MC.missiles[i].isActive) {
      MC.missiles[i].reset(opts);
      mslAdded = true;
      break;
    }
  }
  if(!mslAdded) {
    MC.missiles.push(new MC.Missile(opts));
  }
}

MC.Missile.prototype.reset = function(opts) {
  var color;

  this.isActive = true;       // isActive==true, then apply updates
  this.isMissile = true;      // isMissile==true when in flight
  this.isExplosion = false;   // isExplosion==true after missile destroyed
  this.team = opts.team;      // team=<'player' || 'enemy'>
  this.type = opts.type;      // type=<'icbm' || 'cluster' || 'smart'>
  this.explChain = 0;
  this.cityIdx = -1;
  this.hitTarget = false;
  this.explScale = 1.0;

  if(this.team == 'player') {
    this.src = new THREE.Vector3(MC.bases[opts.side].centerX, MC.settings.base_height, 0);
    this.dest = new THREE.Vector3(opts.dest.x, opts.dest.y, 0);
    this.speed = MC.settings.player_missile_speed;
    color = 0x1197ff;
  } else if(this.team == 'enemy') {
    var topPoint = MC.ground.unproject(0.0, 1.1);
    var randSrcX = MC.getRandomInt(0, MC.settings.world_center_x * 2);
    this.src = new THREE.Vector3(randSrcX, topPoint.y, 0);
    this.cityIdx = MC.City.getActive() || MC.getRandomInt(0, MC.cities.length-1);
    this.dest = new THREE.Vector3(MC.cities[this.cityIdx].centerX, MC.cities[this.cityIdx].height / 2, 0);
    this.speed = opts.speed;
    color = parseInt(opts.color, 16);
  }

  // prep physical missile
  this.pos = new THREE.Vector3(this.src.x, this.src.y, 0);
  this.mslGeom = new THREE.Geometry();
  this.mslGeom.vertices.push(new THREE.Vector3(this.src.x, this.src.y, 0));
  this.mslGeom.vertices.push(new THREE.Vector3(this.src.x, this.src.y, 0));
  this.mslGeom.dynamic = true;
  this.mslMat = new THREE.LineBasicMaterial({ color: color, transparent: true, linewidth: 2 });
  this.mslMesh = new THREE.Line(this.mslGeom, this.mslMat);
  MC.scene.add(this.mslMesh);

  // create fade out tween for missile trail
  var thisMsl = this;
  this.mslFadeTween = new TWEEN.Tween({ opacity: 1.0 });
  this.mslFadeTween.to({ opacity: 0.0 }, MC.settings.explosion_duration / 2);
  this.mslFadeTween.easing(TWEEN.Easing.Circular.Out);;
  this.mslFadeTween.onUpdate(function() {
    thisMsl.mslMat.opacity = this.opacity;
  });
  this.mslFadeTween.onComplete(function() {
    thisMsl.removeSelf(thisMsl.mslMesh);
    thisMsl.mslGeom = null;
    thisMsl.mslMat = null;
    thisMsl.mslMesh = null;
  });

  // set up moverTween
  var easing = this.team == 'player' ? TWEEN.Easing.Exponential.In : TWEEN.Easing.Linear.None;
  this.totalDist = this.src.distanceTo(this.dest);
  this.flightDuration = this.totalDist / this.speed;
  this.moverTween = new TWEEN.Tween({ x: this.src.x, y: this.src.y });
  this.moverTween.to({ x: this.dest.x, y: this.dest.y }, this.flightDuration);
  this.moverTween.easing(easing);
  this.moverTween.onUpdate(function() {
    thisMsl.pos.x = this.x;
    thisMsl.pos.y = this.y;
    thisMsl.mslGeom.vertices[thisMsl.mslGeom.vertices.length-1].copy(thisMsl.pos);
    thisMsl.mslGeom.verticesNeedUpdate = true;
  });
  this.moverTween.onComplete(function() {
    thisMsl.isMissile = false;
    thisMsl.explChain = 0;
    thisMsl.hitTarget = true;
  });

  this.moverTween.start();
};

MC.Missile.prototype.update = function(elapsed) {
  if(!this.isActive) {
    return;
  }

  // msl --> expl transition
  if(this.isMissile == false && this.isExplosion == false) {
    // if enemy missile, destroy the city
    if(this.hitTarget && this.team == 'enemy' && MC.cities[this.cityIdx].isActive) {
      MC.cities[this.cityIdx].hit();
    }

    // create the explosion
    this.explGeom = new THREE.SphereGeometry(MC.settings.explosion_radius, 16, 16);
    this.explMat = new THREE.ShaderMaterial({
      vertexShader: MC.shaders['explosion_shader_vert'],
      fragmentShader: MC.shaders['explosion_shader_frag'],
      uniforms: { opacity: { type: 'f', value: 0.7 }}
    });
    this.explMesh = new THREE.Mesh(this.explGeom, this.explMat);
    this.explMesh.position.copy(this.pos);
    this.explScale = this.team == 'enemy' ? 0.001 : 0.001;
    this.explMesh.scale.set(this.explScale, this.explScale, this.explScale);
    MC.scene.add(this.explMesh);

    // create scaling tween for explosion
    var thisExpl = this;
    this.explScaleTween = new TWEEN.Tween({ scale: this.explScale });
    this.explScaleTween.to({ scale: [ 1.0, 0.001 ] }, MC.settings.explosion_duration);
    this.explScaleTween.interpolation(TWEEN.Interpolation.CatmullRom);
    this.explScaleTween.easing(TWEEN.Easing.Cubic.Out);
    this.explScaleTween.onUpdate(function() {
      thisExpl.explScale = this.scale;
      thisExpl.explMesh.scale.set(this.scale, this.scale, this.scale);;
    });
    this.explScaleTween.onComplete(function() {
      thisExpl.isExplosion = false;
      thisExpl.isActive = false;
      thisExpl.removeSelf(thisExpl.explMesh);
      thisExpl.explGeom = null;
      thisExpl.explMat = null;
      thisExpl.explMesh = null;
    });

    // set animations
    this.isExplosion = true;
    this.moverTween.stop();
    this.mslFadeTween.start();
    this.explScaleTween.start();
  }
};

MC.Missile.prototype.removeSelf = function(mesh) {
  MC.scene.remove(mesh);
};
