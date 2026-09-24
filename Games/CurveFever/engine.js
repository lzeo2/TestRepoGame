/*
 * Source: https://github.com/stravid/achtung-die-kurve
 * License: MIT (see LICENSE.txt)
 * Commit: de0d347ee4c0a87c1928e7b339c771991a080dd8
 * This file is an unmodified concatenation, in dependency order, of the
 * upstream engine sources:
 *   javascripts/config.js
 *   javascripts/utilities.js
 *   javascripts/colormanager.js
 *   javascripts/player.js
 *   javascripts/playermanager.js
 *   javascripts/engine.js
 *   javascripts/game.js
 * The upstream example page also shipped jQuery; the engine itself never
 * uses it, so jQuery is not vendored.
 */
/* ---- upstream javascripts/config.js ---- */
var Config = {
    canvasWidth: 0,
    canvasHeight: 0,

    lineWidth: 3,

    frameRate: 100,         // rendering: frames per second
    pixelsPerSecond: 100,   // pixels per second
    holeSize: 10,           // the size of the holes in pixels
    threshold: 100,

    colorSaturation: 0.99,
    colorValue: 0.99
};
/* ---- upstream javascripts/utilities.js ---- */
var Utilities = {
    random: function(minimum, maximum) {
        return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
    }
};
/* ---- upstream javascripts/colormanager.js ---- */
var ColorManager = function(saturation, value) {
    this.hue = Math.random();
    this.saturation = saturation;
    this.value = value;
};

ColorManager.prototype.getColor  = function() {
    this.hue += 0.618033988749895;
    this.hue %= 1;

    return this.convertHSVToRGB(Math.floor(this.hue * 360), this.saturation, this.value);
};

ColorManager.prototype.reset = function() {
    this.hue = Math.random();  
};

ColorManager.prototype.convertRGBToHex = function(color) {
    var r,
        g,
        b;
    
    r = color[0].toString(16);
    g = color[1].toString(16);
    b = color[2].toString(16);

    if (r.length < 2) {
        r = '0' + r;
    }

    if (g.length < 2) {
        g = '0' + g;
    }

    if (b.length < 2) {
        b = '0' + b;
    }

    return '#' + r + g + b;  
};

ColorManager.prototype.convertHSVToRGB = function(hue, saturation, value) {
    var h,
        hi,
        f,
        p,
        q,
        t,
        rgbResult = [];

    if (saturation === 0) {
        rgbResult[0] = value;
        rgbResult[1] = value;
        rgbResult[2] = value;
    }

    h = hue / 60;
    hi = Math.floor(h);
    f = h - hi;
    p = value * (1 - saturation);
    q = value * (1 - saturation * f);
    t = value * (1 - saturation * (1 - f));

    if (hi === 0) {
        rgbResult = [value, t, p];
    } else if (hi == 1) {
        rgbResult = [q, value, p];
    } else if (hi == 2) {
        rgbResult = [p, value, t];
    } else if (hi == 3) {
        rgbResult = [p, q, value]; 
    } else if (hi == 4) {
        rgbResult = [t, p, value];
    } else if (hi == 5) {
        rgbResult = [value, p, q];
    }

    return [
        Math.floor(rgbResult[0] * 255),
        Math.floor(rgbResult[1] * 255),
        Math.floor(rgbResult[2] * 255)
    ];
};
/* ---- upstream javascripts/player.js ---- */
var Player = function() {
    this.x = 200;
    this.y = 200;
    this.speed = 1;
    this.angle = 0;
    this.name = '';
    this.color = '';
    this.ID = null;
	this.distance = 0;
	this.isPlaying = false;
	this.isAlive = false;
	this.canceled = false;
	this.hole = 0;
	this.holeTimeoutID;
	this.wins = 0;
	
	this.calculateNextHole();
};

Player.prototype.navigate = function(direction) {
    var maximumChangeOfAngle = 2;
	
	direction = Math.min(Math.max(direction, -1), 1);

    this.angle = this.angle + maximumChangeOfAngle * direction;

    this.angle %= 360;

    if (this.angle < 0) {
        this.angle += 360;
    }
};

Player.prototype.resetTimeout = function() {
	clearTimeout(this.holeTimeoutID);
}

Player.prototype.calculateNextHole = function() {
	var that = this;
	var time = 5 + Math.random() * 5;
	
	this.holeTimoutID = setTimeout(function() {
		that.hole = parseInt(Config.holeSize / ((1000 / Config.frameRate / 1000) * Config.pixelsPerSecond));	
	}, time * 1000);	
};

/* ---- upstream javascripts/playermanager.js ---- */
var PlayerManager = function() {
    this.players = [];
    this.colorManager = new ColorManager(Config.colorSaturation, Config.colorValue);
};

PlayerManager.prototype.addPlayer = function(name) {
    var newPlayer = new Player();
    
    newPlayer.name = name;
    newPlayer.color = this.getColor();
	
    newPlayer.ID = this.players.length;

    return this.playerPush(newPlayer);
};

PlayerManager.prototype.playerPush = function (newPlayer) {
	for (var i=0; i < this.players.length; i++) {
		var player = this.players[i];
		
		if (player.canceled) {
			this.players[i] = newPlayer;
			return i;
		}
	}
	
	this.players.push(newPlayer);
	
	return this.players.length - 1;
};

PlayerManager.prototype.removePlayer = function(playerID) {
	this.getPlayerByID(playerID).canceled = true;
};

PlayerManager.prototype.initializePlayers = function() {
    for (var i = 0; i < this.players.length; i++) {
        var player = this.players[i];

        player.x = Utilities.random(Config.canvasWidth / 4, 3 * Config.canvasWidth / 4);
        player.y = Utilities.random(Config.canvasHeight / 4, 3 * Config.canvasHeight / 4);
        player.angle = Math.random() * 360;	
        player.isPlaying = true;
        player.isAlive = true;
		player.resetTimeout();
    }
};

PlayerManager.prototype.getColor = function() {
    return this.colorManager.convertRGBToHex(this.colorManager.getColor());
};

PlayerManager.prototype.navigatePlayer = function(playerID, direction) {
    var player = this.getPlayerByID(playerID);

    player.navigate(direction);
};

PlayerManager.prototype.numberOfPlayersAlive = function() {
    var count = 0;

    for (var i = 0; i < this.players.length; i++) {
        if (this.players[i].isAlive && !this.players[i].canceled) {
            count++;
        }
    }

    return count;
};

PlayerManager.prototype.numberOfPlayers = function() {
    var count = 0;

    for (var i = 0; i < this.players.length; i++) {
        if (!this.players[i].canceled) {
            count++;
        }
    }

    return count;
};

PlayerManager.prototype.resetScores = function() {
	for (var i = 0; i < this.players.length; i++) {
		this.players[i].wins = 0;
		this.players[i].distane = 0;
	}
};

/* ---- GETTER & SETTER ---- */
PlayerManager.prototype.getPlayerByID = function(playerID) {
    return this.players[playerID]; 
};

PlayerManager.prototype.getPlayerName = function(playerID) {
    return this.players[playerID].name;
};

PlayerManager.prototype.getPlayerDistance = function(playerID) {
    return this.players[playerID].distance;
};

PlayerManager.prototype.getPlayerColor = function(playerID) {
    return this.players[playerID].color;
};

PlayerManager.prototype.getPlayerWins = function(playerID) {
    return this.players[playerID].wins;
};

PlayerManager.prototype.getAlivePlayers = function() {
	var alivePlayers = [];
	
	for (var i = 0; i < this.players.length; i++) {
        if (this.players[i].isAlive && !this.players[i].canceled) {
            alivePlayers.push(this.players[i].ID);
        }
    }
	
	return alivePlayers;
};
/* ---- upstream javascripts/engine.js ---- */
var Engine = function(context, players) {
    this.intervalID = 0;
    this.drawingContext = context;
    this.players = players;
	this.onCollision = null;
	this.onRoundOver = null;
	this.lastHit = null;
	this.countWins = false;
	this.playerRank;
};

Engine.prototype.start = function() {
    var that = this;
	
	this.playerRank = [];
	
    if (this.intervalID === 0) {
        this.intervalID = setInterval(function() {
            that.draw();
        }, 1000 / Config.frameRate);    
    }
};

Engine.prototype.stop = function() {
    clearInterval(this.intervalID);
    
    this.intervalID = 0; 
};

Engine.prototype.draw = function() {
    var player,
        deltaX,
        deltaY,
		hit = false;

    for (var i = 0; i < this.players.length; i++) {
        player = this.players[i];

		if (!player.isPlaying || !player.isAlive || player.canceled) {
			continue;
		}
		
		var speed = Config.pixelsPerSecond * (1000 / Config.frameRate / 1000);
		
        deltaX = Math.cos(player.angle * Math.PI / 180) * speed;
        deltaY = Math.sin(player.angle * Math.PI / 180) * speed;
		
		if (player.hole === 0) { 
		
			if (this.hitTest({x: player.x + deltaX, y: player.y + deltaY})) {
				
				this.playerRank.unshift(player.ID);
				
				player.isAlive = false;
				hit = true;

				var count = 0;
				for (var j = 0; j < this.players.length; j++) {
					if (this.players[j].isAlive && this.players[j].isPlaying && !this.players[j].canceled) {
						
						count++;
						
						if (this.countWins) {
							this.players[j].wins++;
						}
					}
				}
				
				if (count < 2) this.stop();
					
				this.checkForCallback(player.ID);
				
				if (count < 2) {
					if (this.onRoundOver) {
						this.onRoundOver();
					}

					return;
				}
			} 
			
			this.drawingContext.strokeStyle = player.color;
			this.drawingContext.fillStyle = player.color;
			this.drawingContext.beginPath();
			this.drawingContext.lineWidth = Config.lineWidth;
			this.drawingContext.moveTo(player.x, player.y);
			this.drawingContext.lineTo(player.x + deltaX, player.y + deltaY);
			this.drawingContext.stroke();
			
		} else {
			
			player.hole--;	
			
			if (player.hole === 0) {
				player.calculateNextHole();
			}
		}
		
        player.x += deltaX;
        player.y += deltaY;
		player.distance += Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));
    } 
	
	if (!hit) {
        this.lastHit = null;
    }
};

Engine.prototype.hitTest = function(point) {
	
	// FIXME: Sometimes unexpected hits.

    if (point.x > Config.canvasWidth || point.y > Config.canvasHeight || point.x < 0 || point.y < 0) {
        return true;
    }

	if (this.drawingContext.getImageData(point.x, point.y, 1, 1).data[3] > Config.threshold) {
		return true;
	}
	
	return false;
};

Engine.prototype.checkForCallback = function(ID) {
	
	// FIXME: It's still triggering more than one callback sometimes.
	
	if (!this.onCollision) {
        return;
    }
	
	if (this.lastHit === null || this.lastHit != ID) {
        this.onCollision(ID);
    }
	
	this.lastHit = ID;
};

/* ---- Getter & Setter ---- */
Engine.prototype.setCollisionCallback = function(callback) {
	this.onCollision = callback;
};

Engine.prototype.setRoundCallback = function(callback) {
	this.onRoundOver = callback;
};
/* ---- upstream javascripts/game.js ---- */
var Game = function(canvasID, canvasWidth, canvasHeight /*, useFullscreen */) {
    if (arguments[3]) {
        this.useFullscreen = arguments[3];
    }

    Config.canvasWidth = canvasWidth;
    Config.canvasHeight = canvasHeight;
	
    this.canvasElement = document.getElementById(canvasID);

    if (this.useFullscreen) {
        Config.canvasWidth = window.innerWidth;
        Config.canvasHeight = window.innerHeight;
    }

    this.canvasElement.width = Config.canvasWidth;
    this.canvasElement.height = Config.canvasHeight; 
    
    if (this.canvasElement.getContext) {
        this.drawingContext = this.canvasElement.getContext('2d');
    } else {
        throw 'No canvas support';
    }
	
    this.playerManager = new PlayerManager();
    this.engine = new Engine(this.drawingContext, this.playerManager.players);
	this.engineOnHalt = false;
};

Game.prototype.getDrawingContext = function() {
    return this.drawingContext;  
};

Game.prototype.start = function() {
	
	if (this.playerManager.numberOfPlayers() < 2) {
		this.engineOnHalt = true;
		this.drawFrame();
		return;
	}
	
	this.drawFrame();
	this.playerManager.initializePlayers();
	this.engine.start();
	this.engineOnHalt = false;
};

Game.prototype.restart = function() {
	this.engine.stop();
	this.drawingContext.clearRect(0, 0, Config.canvasWidth, Config.canvasHeight);
	this.start();
};

Game.prototype.stop = function() {
	this.engine.stop();
};

Game.prototype.addPlayer = function(name) {
    var playerID = this.playerManager.addPlayer(name);
	
	if (this.engineOnHalt) {
		this.start();
	}
	
	return playerID;
};

Game.prototype.removePlayer = function (playerID) {
	this.playerManager.removePlayer(playerID);
	
	if (this.playerManager.numberOfPlayersAlive() < 2) {
		this.stop();

        if (this.engine.onRoundOver) {
            this.engine.onRoundOver();
        }
	}
};

Game.prototype.handleControl = function(playerID, direction) {
    this.playerManager.navigatePlayer(playerID, direction);  
};

Game.prototype.setCollisionCallback = function(callback) {
	this.engine.setCollisionCallback(callback);
};

Game.prototype.setRoundCallback = function(callback) {
	that = this;
	
	this.engine.setRoundCallback(function() {
		that.engine.playerRank.unshift(that.playerManager.getAlivePlayers()[0]);
		
		var stats = {
			winnerID: that.playerManager.getAlivePlayers()[0],
			rank: that.engine.playerRank
		}
		
		callback(stats);
	});
};

Game.prototype.startSession = function() {
	this.playerManager.resetScores();
	this.engine.countWins = true;
};

Game.prototype.stopSession = function() {
	this.engine.countWins = false;
};

Game.prototype.drawFrame = function () {
	this.drawingContext.lineWidth = 10;
	this.drawingContext.strokeStyle = "#E3D42E";
	this.drawingContext.strokeRect(0, 0, Config.canvasWidth - 0, Config.canvasHeight - 0);
};
