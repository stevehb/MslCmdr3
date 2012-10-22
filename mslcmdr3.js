// the MslCmdr namespace
var MC = { };

$(document).ready(function() {
  var i;

  // constants
  MC.WIDTH = $('#game_container').width();
  MC.HEIGHT = $('#game_container').height();
  MC.CAMERA_ORIGIN = new THREE.Vector3(0, 300, -800);
  MC.CAMERA_LOOK_AT = new THREE.Vector3(0, 200, 200);

  // set up three.js basics
  MC.log('setting up three.js basics');
  MC.scene = new THREE.Scene();
  MC.camera = new THREE.PerspectiveCamera(50, MC.WIDTH / MC.HEIGHT, 1, 10000);
  MC.renderer = new THREE.WebGLRenderer({ antialias: true });
  MC.camera.position.copy(MC.CAMERA_ORIGIN);
  MC.camera.lookAt(MC.CAMERA_LOOK_AT);
  MC.renderer.setSize(MC.WIDTH, MC.HEIGHT);
  MC.renderer.setClearColorHex(0x181818, 1.0);
  $(MC.renderer.domElement).attr('id', 'game_canvas');
  $('#game_container').append(MC.renderer.domElement);

  // add lighting
  /*
  MC.lights = new Array();
  for(i = 0; i < 7; i++) {
    MC.lights[i] = new THREE.SpotLight(0xffffff, 50, 0, false);
    MC.lights[i].position.set(100 + (200 * i), 500, 0);
    MC.scene.add(MC.lights[i]);
  }
  */
  var pointLight = new THREE.PointLight(0xffffff, 50, 950);
  pointLight.position.set(0, 100, 0);
  MC.scene.add(pointLight);

  // set up extensions: stats counter, keyboard state, click handlers
  MC.log('adding stats counter');
  MC.stats = new Stats();
  $('#perf_stats').append(MC.stats.domElement);
  MC.keyboard = new THREEx.KeyboardState();
  $("#game_canvas").mousedown(MC.click);
  $("#game_canvas").rightMouseDown(MC.click);

  // create the game state stack
  MC.stateStack = new Array();
  MC.stateStack.push(new MC.TitleState());
  MC.stateStack[MC.stateStack.length-1].activate();




  // add mousemove scene scrolling
  // add to game_container so that scroll works with overlays
  $('#game_container').mousemove(function(evt) {
    var rect = MC.renderer.domElement.getBoundingClientRect();
    var x = evt.clientX - rect.left;
    var y = evt.clientY - rect.top;
    var pctX = (x - (MC.WIDTH / 2)) / (MC.WIDTH / 2);
    var pctY = (y - (MC.HEIGHT / 2)) / (MC.HEIGHT / 2);
    var camOffsetX = pctX * 20;
    var camOffsetY = pctY * 20;
    MC.camera.position.set(camOffsetX, camOffsetY, 0);
    MC.camera.position.addSelf(MC.CAMERA_ORIGIN);
    MC.camera.lookAt(MC.CAMERA_LOOK_AT);
  });

  MC.lastTime = Date.now();
  MC.update();
});


MC.update = function() {
  var nStates;
  var currentTime = Date.now();
  var elapsed = currentTime - MC.lastTime;
  MC.lastTime = currentTime;

  // DEBUG cam movement
  if(MC.keyboard.pressed('down')) {
    MC.camera.position.z -= 5;
  } else if(MC.keyboard.pressed('up')) {
    MC.camera.position.z += 5;
  } else if(MC.keyboard.pressed('left')) {
    MC.camera.position.x += 5;
  } else if(MC.keyboard.pressed('right')) {
    MC.camera.position.x -= 5;
  } else if(MC.keyboard.pressed('w')) {
    MC.camera.position.y += 5;
  } else if(MC.keyboard.pressed('s')) {
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
      RC.log("ERROR: no more states :(");
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
  this.isActive = false;
};

MC.TitleState.prototype.activate = function() {
  var i, topOffset, leftOffset;

  MC.log('activating TitleState');
  $('#score').hide();
  this.isActive = true;

  MC.ground = new MC.Ground();
  MC.cities = new Array(5);
  for(i = 0; i < 5; i++) {
    MC.cities[i] = new MC.City(i);
  }

  // create the title spans
  $('#text_overlay').empty();
  $('#text_overlay').append(
    '<span class="title_overlay" id="title1">M</span>' +
    '<span class="title_overlay" id="title2">s</span>' +
    '<span class="title_overlay" id="title3">l</span>' +
    '<span class="title_overlay" id="title4">C</span>' +
    '<span class="title_overlay" id="title5">m</span>' +
    '<span class="title_overlay" id="title6">d</span>' +
    '<span class="title_overlay" id="title7">r</span>' +
    '<span class="title_overlay" id="title8">3</span>');
  $('.title_overlay').css({
    'margin-left': '8px',
    'margin-right': '8px',
    'font-size': '64pt',
    'font-family': '"Century Gothic", CenturyGothic, AppleGothic, sans-serif',
    'color': 'red',
    'text-shadow': '0 0 0.2em #f00, 0 0 0.8em #f00'
  });

  // set title position
  topOffset = (MC.HEIGHT - $('#text_overlay').height()) / 2;
  leftOffset = (MC.WIDTH - $('#text_overlay').width()) / 2;
  $('#text_overlay').css({
    'top': topOffset + 'px',
    'left': leftOffset + 'px'
  });

  // add chained fade-ins on title letters
  $('.title_overlay').css('display', 'none');
  $('.title_overlay').delay(800).each(function(idx) {
    $(this).delay(idx * 200).fadeIn(2000);
  });
};

MC.TitleState.prototype.deactivate = function() {
  MC.log('deactivating TitleState');
  this.isActive = false;
  // TODO: hide the title
};

MC.TitleState.prototype.update = function() {
  // TODO: wait for click to go to next state
};


/****************
 * PlayState
 ****************/


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
  this.geometry = new THREE.CubeGeometry(1400, 1, 200);
  this.material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
  this.mesh = new THREE.Mesh(this.geometry, this.material);
  MC.scene.add(this.mesh);
};


/****************
 * Cities
 ****************/
MC.City = function(pos) {
  this.centerX = 300 + (200 * pos);
  this.geometry = new THREE.CubeGeometry(50, 100, 50);
  this.material = new THREE.MeshLambertMaterial({ color: 0x223344 });
  this.mesh = new THREE.Mesh(this.geometry, this.material);
  this.mesh.position.set(this.centerX, 50, 0);
  MC.scene.add(this.mesh);
  MC.log('building city ' + pos + ' at x=' + this.centerX);
};

/****************
 * Bases
 ****************/


/****************
 * Missiles
 ****************/


/****************
 * Explosions
 ****************/
