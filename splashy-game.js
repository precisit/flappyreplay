(function() {
  var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                              window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
  window.requestAnimationFrame = requestAnimationFrame;
})();

(function() {
	var performance = window.performance || {now: function() {return Date.now();}};
	window.performance = performance;
})();

Assets = {
	colorScheme: [ ['#9f1c1c', '#701414', '#1f1f1f'], 
			   ['#6a67e0', '#3a397b', '#1f1f1f'], 
			   ['#57bc65', '#2d6134', '#1f1f1f'], 
			   ['#dcd366', '#7a7215', '#1f1f1f'], 
			   ['#a77052', '#a73b00', '#1f1f1f'], 
			   ['#92b9b6', '#3d7d78', '#1f1f1f'], 
			   ['#a2cdee', '#567893', '#1f1f1f'], 
			   ['#a15f86', '#a11e6b', '#1f1f1f'], 
			   ['#a15f86', '#701414', '#1f1f1f'], 
			   ['#9f1c1c', '#3a397b', '#1f1f1f'], 
			   ['#6a67e0', '#2d6134', '#1f1f1f'], 
			   ['#57bc65', '#7a7215', '#1f1f1f'], 
			   ['#dcd366', '#a73b00', '#1f1f1f'], 
			   ['#a77052', '#3d7d78', '#1f1f1f'], 
			   ['#92b9b6', '#567893', '#1f1f1f'], 
			   ['#a2cdee', '#a11e6b', '#1f1f1f'], 
			   ['#595555', '#949494', '#E3DEDE'],],
	celebrateText: ['Wohoo! Score', "I'm awesome!", "Yabadbadooo!", "Like a boss", "Too easy", "One more", "YEESSSS!!", "Oh Em Ge", "OMG OMG OMG", "ZOMGZ", "This is hard"],
	generateObstacle: function(offset, height1, height2) {
		svgArea = d3.select('svg#objects');
		svgArea.append('rect')
			.attr('type', 'enemy')
			.attr('x', offset)
			.attr('y', '-500')
			.attr('width', '82')
			.attr('height', (500+height2-170-42))
			.style('fill', 'url(#tile_pillar2)');

		svgArea.append('rect')
			.attr('type', 'enemy')
			.attr('x', offset)
			.attr('y', (height2-175-42))
			.attr('width', '82')
			.attr('height', '39')
			.style('fill', 'url(#tile_pillarBottom)');

		svgArea.append('rect')
			.attr('type', 'score')
			.attr('x', offset+20)
			.attr('y', (height1-175-40))
			.attr('width', '40')
			.attr('height', '215');

		svgArea.append('rect')
			.attr('type', 'enemy')
			.attr('x', offset)
			.attr('y', (height1+35))
			.attr('width', '82')
			.attr('height', '600')
			.style('fill', 'url(#tile_pillar)');

		svgArea.append('rect')
			.attr('type', 'enemy')
			.attr('x', offset)
			.attr('y', height1)
			.attr('width', '82')
			.attr('height', '40')
			.style('fill', 'url(#tile_pillarTop)');

		svgArea.append('rect')
			.attr('x', offset+2)
			.attr('y', height1-20)
			.attr('width', '80')
			.attr('height', '22')
			.style('fill', 'url(#tile_grass)');
	},
};

Game = {};
Game.gameWidth = 1280;
Game.gameHeight = 720;
Game.scaleFactor = $('.wrapper').width() / Game.gameWidth;
$('svg').attr('width', 1280*Game.scaleFactor);
$('svg').attr('height', 720*Game.scaleFactor);
$('.gameArea').attr('style', 'width: '+(1280*Game.scaleFactor+2)+'px !important; height: '+(720*Game.scaleFactor+2)+'px !important;');
Game.stats = {frameCount: 0, prevFrameCount: 0};
Game.players = {};
Game.bufferedUpdates = {};
Game.recordedUpdates = [];

Game.personalHighscore = [];
Game.globalHighscore = [];
Game.latestHighscore = [];
Game.highscoreBuf = {};

Game.jitterBuffert = 200; //To manage variable latency - updated after ping. 
Game.paused = false;
Game.horizontalSpeed = 0.25;
Game.gravity = 0.00175;
Game.jumpSpeed = -0.5;
Game.jumpKey = 32;
Game.lastObstacleX = 1500; //From html
Game.obstacleCount = 3;
Game.gameRoom = '10000';
Game.lastKnownReplayId = '';
Game.fb_uid = 0;
//Level random
Game.levelRandom = function(fromInt) {
    var x = Math.sin(fromInt) * 10000;
    return x - Math.floor(x);
}

//Camera
Camera = {offset: new Vec2(0,0)};
Camera.update = function(offset) {
	this.offset = offset;
	$('svg[gamelayer]').each(function(index, item) {
		item.viewBox.baseVal.x = offset.x*$(item).data('factor');
		item.viewBox.baseVal.y = offset.y*$(item).data('factor');
	});
}

Game.time = { 
	epoch: 0,
	old: 0,
	lowestTick: 100,
	highestTick: 0,
	timers: {},
	timers2: {},
	start: function() {
		this.epoch = window.performance.now();
		this.old = this.epoch;
	},
	get: function() {
		return window.performance.now() - this.epoch;
	},
	getRounded: function() {
		return Math.round(window.performance.now() - this.epoch);
	},
	getMicro: function() {
		return Math.round((window.performance.now() - this.epoch)*1000.0);
	},	
	getTick: function() {
		n = window.performance.now()
		delta = n - this.old;
		this.old = n;

		this.lowestTick = (delta < this.lowestTick) ? delta : this.lowestTick;
		this.highestTick = (delta > this.highestTick) ? delta : this.highestTick;

		return delta;
	},
	timerPassed: function(timer, time) {
		if(this.timers[timer] === undefined) {
			this.timers[timer] = this.get() + Game.jitterBuffert;
			this.timers2[timer] = time;
			return false;
		}
		var now = this.get();
		var tickTime = now - this.timers[timer];
		if(tickTime > (time - this.timers2[timer])) {
			return true;
		}
		return false;
	},
	timerDestroy: function(timer) {
		if(this.timers[timer] !== undefined) {
			delete this.timers[timer];
		}
	},
	timerExist: function(timer) {
		return this.timers[timer] !== undefined;
	}
};

Game._mainLoop = function() {
	var player = Game.players[Game.userId]; //For convenience
	var dT = Game.time.getTick();
	Game.stats.frameCount++;

	if(!Game.paused) {
		//Update keyboard UI state
		if(UI.keys[Game.jumpKey] || UI.mousePress) {
			UI.keys[Game.jumpKey] = false;
			player.speed.y = Game.jumpSpeed;
			player.jumpPos = player.pos;
			//player.stateChanged = true;
			UI.mousePress = false;
			if(!Game.players[Game.userId].inGame) {
				Game.startNewRound();
			}
			else {
				Game.broadcastUpdate();
			}
		}

		//Update players	
		for (playerId in Game.players) {
			//Update buffered updates from network
			if(Game.bufferedUpdates[playerId] !== undefined && Game.bufferedUpdates[playerId].length > 0) {
				updateCand = Game.bufferedUpdates[playerId][0];
				if(Game.time.timerPassed(playerId, updateCand[1][0]/1000.0)) {
					if(updateCand[0] == 'update') {
						Game.players[playerId].updateState(updateCand[1]);
						if(!Game.players[playerId].inGame)
							Game.players[playerId].prepPlayerForStart();
					}
					else if(updateCand[0] == 'game_over') {
						Game.players[playerId].scorePoints = updateCand[1][2];
						Game.players[playerId].highScore = updateCand[1][3];
						Game.players[playerId].forceMove(updateCand[1][1])
						Game.players[playerId].gameOver(); //Here game over is initiated for other players
						if(Game.players[playerId].isVirtual) {
							if(Game.spectateId == playerId) //Fall back to dead player (smarter; fall back to other in replay)
								Game.players[Game.userId].pos.x = Game.players[playerId].pos.x;
							$( "svg#ui" ).show();
							$( "svg#ui2" ).hide();							
							Game.spectateId = Game.userId;
						}
					}
					/*else if(updateCand[0] == 'reset') {
						console.log('Will not reset time!');
					}*/
					Game.bufferedUpdates[playerId].shift();
				}
			}

			//Update inGame players
			if(Game.players[playerId].inGame) {
				Game.players[playerId].update(dT);

				//Update effects
				//Check for collisions
				if(playerId == Game.userId) {
					box = d3.select('svg#ui')[0][0].createSVGRect();
					box.x = (Game.players[playerId].pos.x-Game.players[playerId].radius-Camera.offset.x)*Game.scaleFactor;
					box.y = (Game.players[playerId].pos.y-Game.players[playerId].radius-Camera.offset.y)*Game.scaleFactor;
					box.width = box.height = Game.players[playerId].radius*2*Game.scaleFactor;
					var listHits = d3.select('svg#objects')[0][0].getIntersectionList(box, d3.select('svg#objects')[0][0]); //This is where the magic happens
					for (var i = 0; i < listHits.length; i++) {
						object = $(listHits[i]);
						if(object.attr('type') == 'enemy')
							Game.players[playerId].objectHit();
						else if(object.attr('type') == 'score' && object.attr('used') === undefined) {
								Game.players[playerId].countScore();
								object.attr('used','');
							}
					}
				}
				else if(playerId == Game.spectateId) {
					box = d3.select('svg#ui')[0][0].createSVGRect();
					box.x = (Game.players[playerId].pos.x-Game.players[playerId].radius-Camera.offset.x)*Game.scaleFactor;
					box.y = (Game.players[playerId].pos.y-Game.players[playerId].radius-Camera.offset.y)*Game.scaleFactor;
					box.width = box.height = Game.players[playerId].radius*2*Game.scaleFactor;
					var listHits = d3.select('svg#objects')[0][0].getIntersectionList(box, d3.select('svg#objects')[0][0]); //This is where the magic happens
					for (var i = 0; i < listHits.length; i++) {
						object = $(listHits[i]);
						if(object.attr('type') == 'score' && object.attr('used') === undefined) {
								Game.players[playerId].countScore();
								object.attr('used','');
							}
					}					
				}
				Game.players[playerId].draw();
			}		
			Game.players[Game.userId].statusCheck();
		}
	}

	//Update viewbox
	var offset = new Vec2(Game.players[Game.spectateId].pos.x-200, 0);
	Camera.update(offset);

	//Generate new content - procedurally 
	if(offset.x+1480 > Game.lastObstacleX+300) {
		//Add another obstacle out of screen
		var diffX = Math.floor(300+Game.levelRandom(Game.gameRoom+Game.obstacleCount)*100);
		var holeHeight = Math.floor(260+Game.levelRandom(2*Game.gameRoom+Game.obstacleCount)*320);
		holeHeight1 = (holeHeight - holeHeight%40);
		holeHeight2 = ((holeHeight) - (holeHeight)%42);
		Game.lastObstacleX = Game.lastObstacleX + diffX;
		Game.lastObstacleX = Game.lastObstacleX - Game.lastObstacleX%84;
		Game.obstacleCount += 1;
		
		//Generate new obstacle
		Assets.generateObstacle(Game.lastObstacleX, holeHeight1, holeHeight2);

		//Randomly place arrows, but select wisly
		if(Math.round(Game.levelRandom(322 + Game.obstacleCount*432)*4)%4 == 0) {
			var signX = Game.lastObstacleX - 64;
			signX = signX - signX%64;
			var chosenSign = 4;
			if(holeHeight1 > 460)
				chosenSign = 1;
			if(holeHeight1 < 380)
				chosenSign = 0;
			if(holeHeight > 520 || holeHeight1 < 300)
				chosenSign = 3;
			d3.select('svg#players').append('rect')
				.attr('x', signX)
				.attr('y', '482')
				.attr('width', '64')
				.attr('height', '128')
				.style('fill', 'url(#sign_'+chosenSign+')');
		}
	}

	requestAnimationFrame(Game._mainLoop);
};

Game._fpsLoop = function() { 
	Game.time.lowestTick = 100;
	Game.time.highestTick = 0;
	Game.fps = (Game.stats.frameCount-Game.stats.prevFrameCount)/1;
	$('div#fps').html(""+Game.fps);
	Game.stats.prevFrameCount = Game.stats.frameCount;
};

Game.startNewRound = function() {
	d3.selectAll('svg#ui text#gameover').transition().attr('transform','translate(640,-500)').style('opacity',0).duration(300).ease('linear').remove();
	d3.selectAll('svg#ui text#replBtn').transition().attr('transform','translate(640,-500)').style('opacity',0).duration(300).ease('linear').remove();
	d3.selectAll('svg#ui text#shareBtn').transition().attr('transform','translate(640,-500)').style('opacity',0).duration(300).ease('linear').remove();
	//d3.select('svg#ui').selectAll("text#pHigh").transition().attr('transform','translate(780,720)').style('opacity',0).delay(function(d, i) { return (10-i)*15;}).duration(100).ease('linear').remove();
	//d3.select('svg#ui').selectAll("text#gHigh").transition().attr('transform','translate(300,720)').style('opacity',0).delay(function(d, i) { return (10-i)*15;}).duration(100).ease('linear').remove();
	d3.select('svg#ui').selectAll("text#personalHighscore").transition().attr('transform','translate(940,-400)').style('opacity',0).duration(300).ease('linear').remove();
	d3.select('svg#ui').selectAll("text#latestHighscore").transition().attr('transform','translate(640,-400)').style('opacity',0).duration(300).ease('linear').remove();
	d3.select('svg#ui').selectAll("text#globalHighscore").transition().attr('transform','translate(340,-400)').style('opacity',0).duration(300).ease('linear').remove();
	d3.select('svg#ui').selectAll("text#label1").transition().attr('transform','translate(340,-400)').style('opacity',0).duration(300).ease('linear').remove();
	d3.select('svg#ui').selectAll("text#label2").transition().attr('transform','translate(640,-400)').style('opacity',0).duration(300).ease('linear').remove();
	d3.select('svg#ui').selectAll("text#label3").transition().attr('transform','translate(940,-400)').style('opacity',0).duration(300).ease('linear').remove();
	d3.select('svg#ui').selectAll("text#label4").transition().attr('transform','translate(640,-200)').style('opacity',0).duration(300).ease('linear').remove();
	d3.selectAll('svg#ui rect').transition().attr('transform','translate(640,-500)').style('opacity',0).duration(300).ease('linear').remove();
	d3.selectAll('svg#ui line#top').transition().attr('transform','translate(640,-530)').style('opacity',0).duration(300).ease('linear').remove();
	d3.selectAll('svg#ui line#low').transition().attr('transform','translate(640,-530)').style('opacity',0).duration(300).ease('linear').remove();
	Game.players[Game.userId].startRound();
	$('svg#objects [type="score"][used]').each(function(index, item) {
		$(this).removeAttr('used');
	});
};

Game.addPlayer = function(userId) {
	if (!(userId in Game.players)) {
		newPlayer = new Player(userId);
		Game.players[userId] = newPlayer;
		return newPlayer;
	}
};

Game.removePlayer = function(userId) {
	if(Game.players[userId] !== undefined) {
		Game.players[userId].cleanUp();
		delete Game.players[userId];
	}
};

Game.broadcastUpdate = function() {
	var state = Game.players[Game.userId].getState();
	jsFlow.messageChannel(Game.gameRoom, state, 'game_update');
	Game.recordedUpdates.push(state); //Record the state updates
};

Game.executeReplayFromHash = function(item) {
	$( "svg#ui" ).hide();
	$( "svg#ui2" ).show();
	$('svg#objects [type="score"][used]').each(function(index, item) {
		$(this).removeAttr('used');
	});
	window.location.href=item;
	items = item.split('#');
	items = items[1].split('=');
	key = items[1];	
	$.get( "http://splashmmo.com/recorded/" + key, function( data ) {
		plbId = 'plb-'+data.time+'-'+data.pilot;
		Game.time.timerDestroy(plbId); //In case we view the same replay multiple times

		Game.addPlayer(plbId);
		Game.players[plbId].updateNick(data.pilot);
		Game.playbackScore.text('0');
		Game.playbackPilot.text(data.pilot);
		Game.players[plbId].colorId = data.colorId;
		Game.players[plbId].prepPlayerForStart();
		Game.players[plbId].inGame = false;
		Game.players[plbId].isVirtual = true;
		Game.bufferedUpdates[plbId] = [];

		//TODO: Remake this buffered array so it is more efficient
		for(var i = 0; i < data.data.length; i++) {
			if(i < data.data.length-1)
				Game.bufferedUpdates[plbId].push(['update',data.data[i]]);
			else {
				Game.bufferedUpdates[plbId].push(['game_over',data.data[i]]);
			}
		}

		Game.spectateId = plbId;

		//Hide UI div / SVG (all game over texts, etc)
	},'json');
}

//Sprites
function Player(userId) {
	this.playerId = userId;
	this.inGame = true;
	this.isVirtual = false; //Used for fake players when doing playback
	this.pilot = 'anon';

	//Position and orientation
	this.uiPos = 0;
	this.pos = new Vec2(0,0);
	this.speed = new Vec2(0,0);
	this.jumpPos = new Vec2(0,0);
	this.scorePoints = 0;
	this.highScore = 0;
	this.aimAngle = 0;
	this.lastUpdate = 0;

	//Game play properties
	if(this.playerId == Game.userId)
		this.colorId = 0;
	else
		this.colorId = 16;

	this.radius = 28;
	this.health = 1;
	this.damageLabelBuffert = 0;

	var self = this;

	if(this.playerId == Game.userId) {
		this.scoreDisplay = d3.select('svg#ui').append('text').attr('text-anchor', 'middle').attr('transform','translate('+(100+this.uiPos*140)+',70)').text(this.scorePoints).attr('fill',Assets.colorScheme[this.colorId][1]).attr('font-family','Freckle Face').attr('font-size','38');
		this.nameDisplay = d3.select('svg#ui').append('text').attr('text-anchor', 'middle').attr('transform','translate('+(100+this.uiPos*140)+',30)').text(this.pilot).attr('fill',Assets.colorScheme[this.colorId][1]).attr('font-family','Freckle Face').attr('font-size','24');
	}

	//Player avatar
	var avatar = d3.select('svg#players').append('g').attr('transform','translate(200,100)').style('opacity', 0);
	avatar.append('circle').attr('id','b').attr('r',this.radius).style("fill", Assets.colorScheme[this.colorId][1]);
	avatar.append('circle').attr('id','t').attr('r',this.radius/2).style("fill", Assets.colorScheme[this.colorId][0]);
	this.aim = avatar.append('line').attr('x1',0).attr('y1',0).attr('x2',this.radius*1.1).attr('y2',0).attr('transform','rotate(0)').style('stroke',Assets.colorScheme[this.colorId][2]).style('stroke-width', 10).style("stroke-linecap", "round");
	var textGroup = avatar.append('g');
	var name = textGroup.append('text').attr('text-anchor', 'middle').attr('transform','translate(0,'+(-10-this.radius)+')').text(this.pilot).attr('fill',Assets.colorScheme[this.colorId][1]).attr('font-family','Freckle Face').attr('font-size','18');

	this.colorChangeEvent = function(id) {
		payload = {};
		payload.colorId = id;		
		jsFlow.messageChannel(Game.gameRoom,payload,'new_color');
	}

	this.shiftColor = function(id) {
		this.colorId = (Assets.colorScheme.length + id) % Assets.colorScheme.length;
		avatar.select('circle#b').transition().style('fill', Assets.colorScheme[this.colorId][1]).transition().attr('transform','scale(1)').ease('elastic');
		avatar.select('circle#t').transition().style('fill', Assets.colorScheme[this.colorId][0]).transition().attr('transform','scale(1)').ease('elastic');
		this.aim.transition().style('stroke', Assets.colorScheme[this.colorId][2]);
	}

	this.updateNick = function(nick) {
		this.pilot = nick;
		if(this.playerId == Game.userId)
			this.nameDisplay.text(this.pilot);
		name.text(nick);
	}

	this.prepareForGame = function() {
		avatar.transition().attr('transform','translate('+this.pos.x+','+this.pos.y+'),scale(1)').duration('1000').ease('elastic');
		this.aim.transition().attr('transform','rotate('+(this.aimAngle * (180 / Math.PI))+')').duration('300').ease('linear');
	}

	this.cleanUp = function() {
		avatar.transition().attr('transform', 'translate('+this.x+',-20)').remove();
	}

	this.startRound = function() {
		this.prepPlayerForStart();
		this.scoreDisplay.text(this.scorePoints);
		//Reset recording
		Game.recordedUpdates = [];
		//Initial state
		Game.broadcastUpdate();
	}

	this.prepPlayerForStart = function() {
		this.inGame = true;
		this.health = 1;
		this.scorePoints = 0;
		this.speed.y = 0;
		this.jumpPos.x = this.pos.x = 200;
		this.jumpPos.y = this.pos.y = 100;
		this.forceMove([200,100]);
		avatar.select('text#vilhelmscream').remove();
		if(this.playerId == Game.userId)
			avatar.transition().attr('transform','translate('+this.pos.x+','+this.pos.y+'),scale(1)').style('opacity',1).ease('linear').duration(500);
		else
			avatar.transition().attr('transform','translate('+this.pos.x+','+this.pos.y+'),scale(1)').style('opacity',1).ease('linear').duration(1);
	}

	//Game play methods
	this.objectHit = function() {
		damage = 1;
		this.health -= damage;
	}
	
	this.gameOver = function() {
		this.inGame = false;
		this.speed.x = 0;
		avatar.append('text').attr('text-anchor', 'middle').attr('transform','translate(0,'+(-30-this.radius)+')').text('Aaaaaaaargh!').attr('fill',Assets.colorScheme[this.colorId][1]).attr('font-family','Freckle Face').attr('font-size', '24').attr('id', 'vilhelmscream');
		avatar.attr('transform','translate('+this.pos.x+','+this.pos.y+')').transition().attr('transform','translate('+this.pos.x+','+this.pos.y+'),scale(3)').style('opacity',0).ease('linear').duration(500);
	}

	this.countScore = function() {
		this.scorePoints += 1;
		if(this.playerId == Game.userId) {
			this.scoreDisplay.text(this.scorePoints);
			this.celebrate();
		}
		else if(this.playerId = Game.spectateId)
			Game.playbackScore.text(this.scorePoints);
	}

	//Misc methods
	this.celebrate = function() {
		var randomX = 0;// Math.random()*4-2;
		var randomY = -50;// -Math.random()*2-10;
		var textIndex = Math.round(Math.random()*10);

		var myLabel = textGroup.select('text[done=\'true\']');
		if(myLabel[0][0] == null) {
			myLabel = textGroup.append('text').attr("text-anchor", "middle");
		}
		else
			myLabel.style('opacity', 1).attr('transform', 'translate(0,0), scale(1)'); //Reset the reused text label

		myLabel.style("opacity",1).attr('done','false').attr('x', randomX).attr('y', randomY).text(Assets.celebrateText[textIndex]).attr('fill',Assets.colorScheme[this.colorId][1]).attr('font-family','Freckle Face');
		myLabel.transition().attr('transform', 'translate(0,0), scale('+(2+this.scorePoints/10)+')').style("opacity",0).duration('750').ease('linear').each('end', function() { d3.select(this).attr('done','true');});//.remove();
	}

	this.update = function(dT) {
		this.speed.x = Game.horizontalSpeed;
		this.speed.y += Game.gravity*dT;

		this.speed.clampZero();

		deltaPos = new Vec2(this.speed);
		vMath.mulS(deltaPos,dT);
		vMath.addV(this.pos,deltaPos);

		//Primitive world edge detection
		if(this.pos.y > 800)
			this.objectHit();

		this.aimAngle = Math.atan(this.speed.y/this.speed.x);
	}

	this.statusCheck = function() {
		if(this.inGame && this.health <= 0) {
			if(this.scorePoints > this.highScore)
				this.highScore = this.scorePoints;
			Game.recordedUpdates.push([Game.time.getMicro(),this.pos, this.scorePoints, this.highScore]); //Record the state updates
			this.gameOver();
			UI.preannounce();
			self = this;
			code = Math.random().toString(36).substr(2);
			jsFlow.messageChannel(Game.gameRoom, [Game.time.getMicro(),self.pos, self.scorePoints, self.highScore, code], 'game_over_instant');	
			if(this.scorePoints > 0)
				$.post( "http://backend.splashmmo.com:1337/recordedUpdate", JSON.stringify({gameRoom: Game.gameRoom, pilot: this.pilot, colorId: this.colorId, data: Game.recordedUpdates, score: this.scorePoints, code: code, signedRequest: window.signedRequest}), function( data ) {
					jsFlow.messageChannel(Game.gameRoom, [data.code, data.key], 'game_over_delayed');		
				}, 'json');
		}
	}

	this.draw = function() {
		avatar.attr('transform','translate('+this.pos.x+','+this.pos.y+')');
		this.aim.attr('transform','rotate('+(this.aimAngle * (180 / Math.PI))+')');
	}

	this.getState = function() {
		return [Game.time.getMicro(), [this.jumpPos.x, this.jumpPos.y]];
	}

	this.forceMove = function(newPos) {
		this.pos.set(newPos);
		this.draw();
	}

	this.updateState = function(newState) {
		delta = newState[0] - this.lastUpdate;
		if(delta < 0)
			console.log('Warning - Delta < 0, unresolved jitter?');
		//if(delta > 0) {
			this.pos.set(newState[1]);
			if(this.inGame)
				this.speed.y = Game.jumpSpeed;
			this.lastUpdate = newState[0];
		//}
		//else
		//	console.log('WARNING - NEGATIVE DELTA - JITTER?');
	}
};

//User interface
var UI = {};
UI.keys = {};
UI.mousePress = false;

//General event listeners
$(".gameArea").mousemove(function(e){
//	Game.players[Game.userId].pos.x = e.offsetX/Game.scaleFactor;
//	Game.players[Game.userId].pos.y = e.offsetY/Game.scaleFactor;	
});
$(".gameArea").on('touchstart mousedown',function(e){
	UI.mousePress = true;
});
$(".gameArea").on('touchend mouseup touchcancel',function(e){
	UI.mousePress = false;
});
/*$(window).scroll(function(e){
	e.preventDefault();
	console.log('GOT SCROLL EVENT!');
});*/
$(".gameArea").keydown(function(e) {
	e.preventDefault();
	if(!e.altKey && !e.metaKey)
		UI.mousePress = true;
	UI.keys[e.which] = true;
});
$(".gameArea").keyup(function(e) {
	e.preventDefault();
	if(!e.altKey && !e.metaKey)
		UI.mousePress = false;
	delete UI.keys[e.which];
});
$(window).on('scroll', function(e) {
	e.preventDefault();
})


UI.showPaused = function() {
	d3.select('svg#ui').append('text').attr('id','pausedText').attr('text-anchor', 'middle').attr('transform','translate(640,360)').text('Game Paused').attr('fill','#542B1F').attr('font-family','Freckle Face').attr('font-size','64').style('opacity', 0);
	d3.select('svg#ui text#pausedText').transition().style('opacity', 1).duration('300').ease('linear');
};

UI.hidePaused = function() {
	d3.select('svg#ui text#pausedText').transition().style('opacity', 0).duration('300').ease('linear').remove();
};

UI.preannounce = function() {
	var text = d3.select('svg#ui').append('text').attr('id','gameover').attr('text-anchor', 'middle').attr('transform','translate(640,100),scale(0)').text('Game over!').attr('fill','#542B1F').attr('font-family','Freckle Face').attr('font-size','64');
	
	var bg = d3.select('svg#ui').append('rect').attr({x: -450, y: -150, rx: 30, ry: 30, width: 900, height: 430}).attr('transform','translate(640,720),scale(1)').style('fill', '#000000').style('opacity', 0.3);
	var topLine = d3.select('svg#ui').append('line').attr('id','top').attr({x1: -420, y1: -152, x2: 420, y2: -152}).attr('transform','translate(640,720),scale(1)').style('stroke', '#DBE8D8');	
	var lowLine = d3.select('svg#ui').append('line').attr('id','low').attr({x1: -100, y1: 0, x2: 100, y2: 0}).attr('transform','translate(640,482),scale(0)').style('stroke', '#DBE8D8');	
	
	var label1 = d3.select('svg#ui').append('text').text('all time')
							.attr('id','label1')
							.attr('transform','translate(340, 793),scale(1)')
							.attr('text-anchor', 'middle')
							.attr('fill','#93E880')
							.attr('font-family','Aldrich')
							.attr('font-size','18');
	var label2 = d3.select('svg#ui').append('text').text('24 hours')
							.attr('id','label2')
							.attr('transform','translate(640, 793),scale(1)')
							.attr('text-anchor', 'middle')
							.attr('fill','#93E880')
							.attr('font-family','Aldrich')
							.attr('font-size','18');
	var label3 = d3.select('svg#ui').append('text').text('personal')
							.attr('id','label3')
							.attr('transform','translate(940, 793),scale(1)')
							.attr('text-anchor', 'middle')
							.attr('fill','#93E880')
							.attr('font-family','Aldrich')
							.attr('font-size','18');
	var label4 = d3.select('svg#ui').append('text').text('replay')
							.attr('id','label4')
							.attr('transform','translate(640, 472),scale(0)')
							.attr('text-anchor', 'middle')
							.attr('fill','#93E880')
							.attr('font-family','Aldrich')
							.attr('font-size','18');

	var repButton = d3.select('svg#ui').append('text').attr('id','replBtn').attr('text-anchor', 'middle').attr('transform','translate(580,560),scale(0)').text('').attr('fill','#DBE8D8').attr('font-family','icomoon').attr('font-size','64')
							.on('mouseover', function(d) {
								d3.select(this).attr('fill', '#93E880');
							})
							.on('mouseout', function(d) {
								d3.select(this).attr('fill', '#DBE8D8');
							})						
							.on('mousedown', function(d) {
								d3.event.stopPropagation();
								document.location.hash = 'game=' + Game.lastKnownReplayId;
								Game.executeReplayFromHash('#game=' + Game.lastKnownReplayId);
							});

	var shareButton = d3.select('svg#ui').append('text').attr('id','shareBtn').attr('text-anchor', 'middle').attr('transform','translate(700,560),scale(0)').text('').attr('fill','#DBE8D8').attr('font-family','icomoon').attr('font-size','64')
							.on('mouseover', function(d) {
								d3.select(this).attr('fill', '#93E880');
							})
							.on('mouseout', function(d) {
								d3.select(this).attr('fill', '#DBE8D8');
							})
							.on('mousedown', function(d) {
								d3.event.stopPropagation();
								console.log('Will post to Facebook!', Game.lastKnownReplayId)
								UI.postToFacebook(Game.lastKnownReplayId, 0);
							});

	//var newGameButton = d3.select('svg#ui').append('text').attr('id','info').attr('text-anchor', 'middle').attr('transform','translate(670,170),scale(0)').text('').attr('fill','#542B1F').attr('font-family','icomoon').attr('font-size','64');
	var format = d3.time.format("%Y-%m-%d");

	var personalHighscore = UI.drawHighscore('personalHighscore', 940, 620);
	var latestHighscore = UI.drawHighscore('latestHighscore', 640, 620);
	var globalHighscore = UI.drawHighscore('globalHighscore', 340, 620);

	text.transition().attr('transform','translate(640,100),scale(1)').duration('2000').ease('elastic');

	bg.transition().attr('transform','translate(640,300),scale(1)').duration('250').ease('cubic-in-out');
	topLine.transition().attr('transform','translate(640,331),scale(1)').duration('250').ease('cubic-in-out');
	//newGameButton.transition().attr('transform','translate(670,170),scale(1)').duration('2000').ease('elastic');
	personalHighscore.transition().attr('transform','translate(940,210),scale(1)').duration('250').ease('cubic-in-out');
	latestHighscore.transition().attr('transform','translate(640,210),scale(1)').duration('250').ease('cubic-in-out');
	globalHighscore.transition().attr('transform','translate(340,210),scale(1)').duration('250').ease('cubic-in-out');
	label1.transition().attr('transform','translate(340,173),scale(1)').duration('250').ease('cubic-in-out');
	label2.transition().attr('transform','translate(640,173),scale(1)').duration('250').ease('cubic-in-out');
	label3.transition().attr('transform','translate(940,173),scale(1)').duration('250').ease('cubic-in-out');
}

UI.drawHighscore = function(list, offsetX, offsetY) {
	d3.select('svg#ui').selectAll("text#"+list).remove();
	return d3.select('svg#ui').selectAll("text#"+list)
							.data(Game[list]).enter()
							.append('text').text(function(d) { 
								date = new Date(d.time*1000);
								return  d.pilot + '  ['+d.score+']';// + ' (' + format(date) + ')'; 
							})
							.attr('y', function(d, i){ 
								return i*25; 
							})
							.attr('id',list)
							.attr('transform','translate('+offsetX+', '+(210+offsetY)+'),scale(1)')
							.attr('text-anchor', 'middle')
							.attr('fill','#DBE8D8')
							.attr('font-family','Aldrich')
							.attr('font-size','18')
							.on('mouseover', function(d) {
								d3.select(this).attr('fill', '#93E880');
							})
							.on('mouseout', function(d) {
								d3.select(this).attr('fill', '#DBE8D8');
							})
							.on('mousedown', function(d) {
								d3.event.stopPropagation();
								gameId = d['key'];
								document.location.hash = 'game=' + gameId;
								Game.executeReplayFromHash('#game=' + gameId)
							});
}

UI.announce = function(from, payload) {
	if(payload[2] > 0) {
		jQuery('<div/>', {
			id: payload[4],
		    html: '&#9760; '+Game.players[from].pilot+' lost at '+(''+payload[2]+'').replace(/\</g,"&lt;").replace(/\>/g,"&gt;")
		}).appendTo('.chatArea');//.addClass("flash");
		$('.chatArea').scrollTop($('.chatArea')[0].scrollHeight);
	}
}

UI.announceComplement = function(from, payload) {
	//Temporary ugly solution
	$('.chatArea div#'+payload[0]).append(' <a href="#game='+payload[1]+'" onClick="Game.executeReplayFromHash(\'#game='+payload[1]+'\'); return false;"> &#xE612 </a>');
}

UI.postToFacebook = function(key, score) {
	FB.ui({
		method: 'feed',
		link: 'http://flappyreplay.com/#game='+key,
		caption: 'Live replays of flappy runs, click link to view replay now!',
	}, function(response){});
}

$(window).resize(function(e) {
	Game.scaleFactor = $('.wrapper').width() / Game.gameWidth;
	$('svg').attr('width', 1280*Game.scaleFactor);
	$('svg').attr('height', 720*Game.scaleFactor);
	$('.gameArea').attr('style', 'width: '+(1280*Game.scaleFactor+2)+'px !important; height: '+(720*Game.scaleFactor+2)+'px !important;');
});


$('input#nick').keyup(function(e){
	jsFlow.messageChannel(Game.gameRoom, $('input#nick').val(), 'nick');
	localStorage.nick = $('input#nick').val();
});

$('input#message').keypress(function (e) {
	if (e.which == 13) {
		jsFlow.messageChannel(Game.gameRoom, $(this).val(), 'message');
		$(this).val('');
	}
});

jsFlow.onRecievedUserId = function(userId) {
	Game.userId = userId;

	Game.addPlayer(Game.userId);

	if(window.location.hash) 
		Game.executeReplayFromHash(window.location.hash);
	else
		Game.players[Game.userId].startRound();

	Game.spectateId = userId;

	//All relevant game loops
	if(Game._intervalId === undefined)
		Game._intervalId = setTimeout(function() {Game.time.start(); Game._mainLoop();}, 100);
	if(Game._fpsId === undefined)
		Game._fpsId = setInterval(Game._fpsLoop, 1000);

	Game.time.start();

	Assets.generateObstacle(840, 520, 504);
	Assets.generateObstacle(1176, 440, 462);
	Assets.generateObstacle(1512, 320, 336);
};

//Pong
jsFlow.addHandler('ping', function(payload, from) {
	ping = Game.time.get() - payload;
	Game.jitterBuffert = 100+ping*1.5;
});

//jsFlow stuff
jsFlow.onFlowReady = function() {
	Game.paused = false;
	UI.hidePaused();

	if(localStorage.nick === undefined && Game.personalHighscore[0] !== undefined && Game.personalHighscore[0].pilot !== undefined && Game.personalHighscore[0].pilot !== '') {
		$('input#nick').val(Game.personalHighscore[0].pilot);
	}

	if($('input#nick').val() != 'anon') {
		jsFlow.messageChannel(Game.gameRoom, $('input#nick').val(), 'nick');
	}
	jsFlow.messageUser(Game.userId, Game.time.get(), 'ping');
};

jsFlow.onFlowClosed = function() {
	Game.paused = true;
	UI.showPaused();
};

jsFlow.run('c353d99f05fc04f7d1fa045a', { defaultChannels: [Game.gameRoom], sessionAuthURL: 'http://backend.splashmmo.com:1337/digest', debugMsg: false });

//Process game updates
jsFlow.addHandler('game_update', function(payload, from, channelId){
	if(from != Game.userId) {
		if (!(from in Game.players)) {
			Game.addPlayer(from);
			Game.players[from].prepPlayerForStart();
			Game.players[from].inGame = false;
		}

		//Push update on stack 
		if(Game.bufferedUpdates[from] === undefined)
			Game.bufferedUpdates[from] = [];

		//Epoch reset
		//if(!Game.players[from].inGame) {
		//}

		Game.bufferedUpdates[from].push(['update',payload]);
	}
});

//Process game updates
jsFlow.addHandler('game_over_instant', function(payload, from, channelId){
	if (from != Game.userId && from in Game.players) {
		//Push update on stack 
		if(Game.bufferedUpdates[from] === undefined)
			Game.bufferedUpdates[from] = [];
		Game.bufferedUpdates[from].push(['game_over',payload]);
	}
	if(from in Game.players && payload[2] > 0) {
		//Buffert gameData
		Game.highscoreBuf[payload[4]] = payload;
	}

	UI.announce(from, payload);
});

jsFlow.addHandler('game_over_delayed', function(payload, from, channelId){
	UI.announceComplement(from, payload);
	if(from == Game.userId && Game.players[Game.userId].inGame == false) {
		Game.lastKnownReplayId = payload[1];
		d3.select('svg#ui text#replBtn').transition().attr('transform','translate(580,560),scale(1)').duration('2000').ease('elastic');
		d3.select('svg#ui text#shareBtn').transition().attr('transform','translate(700,560),scale(1)').duration('2000').ease('elastic');
		d3.select('svg#ui line#low').transition().attr('transform','translate(640,482),scale(1)').duration('2000').ease('elastic');
		d3.select('svg#ui text#label4').transition().attr('transform','translate(640,472),scale(1)').duration('2000').ease('elastic');
	}

	if(payload[0] in Game.highscoreBuf) {
		iPayload = Game.highscoreBuf[payload[0]];
		delete Game.highscoreBuf[payload[0]];

		scoreLists = {'globalHighscore': 340, 'latestHighscore': 640};
		if(from == Game.userId) //TODO: Check fb_uid ?? 
			scoreLists['personalHighscore'] = 940;

		for(key in scoreLists) {
			if(Game[key].length == 0) {
				Game[key].push({gameRoom: Game.gameRoom, pilot: Game.players[from].pilot, score: iPayload[2], key: payload[1], newItem: true});
			}
			else 
				for(i in Game[key]) {
					if(Game[key][i].score <= iPayload[2]) {
						Game[key].splice(i, 0, ({gameRoom: Game.gameRoom, pilot: Game.players[from].pilot, score: iPayload[2], key: payload[1], newItem: true}));
						if(Game[key].length > 10)
							Game[key].pop();
						break;
					}
					else if(i < 9 && i == Game[key].length-1) {
						console.log('Went inside');
						Game[key].push({gameRoom: Game.gameRoom, pilot: Game.players[from].pilot, score: iPayload[2], key: payload[1], newItem: true});
					}
				}

			//Update scoreboard
			if(Game.players[Game.userId].inGame == false) {
				UI.drawHighscore(key, scoreLists[key], 0);
					d3.select('svg#ui').selectAll("text#"+key)
					.data(Game[key])
					.transition().attr('fill', function(d, i){
						if(Game[key][i].newItem !== undefined) {
							delete Game[key][i]['newItem'];
							return '#FF0000';
						}
						else
							return '#DBE8D8';
					}).duration('400').transition().attr('fill', '#DBE8D8').duration('400');
			}
			for(i = 0; i < Game[key].length; i++){
				delete Game[key][i]['newItem'];
			}
		}
	}
});

//Player options, color, nick and chat
jsFlow.addHandler('new_color', function(payload, from, channelId) {
	if (from in Game.players)
		Game.players[from].shiftColor(payload.colorId);
});

jsFlow.addHandler('nick', function(payload, from, channelId) {
	if (from in Game.players)
		Game.players[from].updateNick(payload);
});

jsFlow.addHandler('message', function(payload, from, channelId) {
	if (from in Game.players) {
		$('.chatArea').append('['+Game.players[from].pilot+'] '+payload.replace(/\</g,"&lt;").replace(/\>/g,"&gt;")+'<br>');
		$('.chatArea').scrollTop($('.chatArea')[0].scrollHeight);
	}
});

//Focus on the right element
$(function() {
	$('.gameArea').focus();

	$.get( "http://backend.splashmmo.com:1337/highscore/10000", function( data ) {
		Game.globalHighscore = data;
	}, 'json');

	$.get( "http://labs.precisit.com:1337/highscore24/10000", function( data ) {
		Game.latestHighscore = data;
	}, 'json');

	if(localStorage.nick !== undefined && localStorage.nick != '' && localStorage.nick != 'anon')
	{
		$('input#nick').val(localStorage.nick);
	}	
	Game.playbackPilot = d3.select('svg#ui2').append('text').attr('text-anchor', 'middle').attr('transform','translate('+(100)+',30)').attr('fill',Assets.colorScheme[16][1]).attr('font-family','Freckle Face').attr('font-size','24');
	Game.playbackScore = d3.select('svg#ui2').append('text').attr('text-anchor', 'middle').attr('transform','translate('+(100)+',70)').attr('fill',Assets.colorScheme[16][1]).attr('font-family','Freckle Face').attr('font-size','38');
	$( "svg#ui2" ).hide();
});

/*file:///Users/magnus/Documents/Development/flapmmo/index.html#game=dff4272fe0121959fe9ca6b08b16dc35eab5587119ba255856556315*/






