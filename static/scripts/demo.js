var util = require('util');
var css = require('dom-css');
var grid = require('./index');
var parse = require('parse-color');
var position = require('mouse-position');
var mousetrap = require('mousetrap');
var colors = require('colors.css');
var io = require('socket.io-client')();
var $ = require("jquery");
var gaussian = require('gaussian');

var data = [];
var background = [];
for (var i = 0; i < settings.rows; i++) {
  for (var j = 0; j < settings.columns; j++) {
    data.push([0, 0, 0]);
    background.push([0, 0, 0]);
  }
}

BLUE = [0.50, 0.86, 1.00];
YELLOW = [1.00, 0.86, 0.50];
WHITE = [1.00, 1.00, 1.00];

var pixels = grid(data, {
  root: document.body,
  rows: settings.rows,
  columns: settings.columns,
  size: settings.block_size,
  padding: settings.padding,
  background: [0.1, 0.1, 0.1],
  formatted: true
});

var mouse = position(pixels.canvas);

var library = {
    "donation": {
        "Frequency": {
            "Start": 734.7291558862061,
            "ChangeSpeed": 0.23966899924998872,
            "ChangeAmount": 8.440642297186233
        },
        "Volume": {
            "Sustain": 0.09810917608846803,
            "Decay": 0.30973154812929393,
            "Punch": 0.5908451401277536
        }
    },
};

Food = function (settings) {
    if (!(this instanceof Food)) {
        return new Food();
    }
    this.id = settings.id;
    this.position = settings.position;
    this.color = settings.color;
    return this;
};

respawnFood = function () {
    food.push(new Food({
        id: food.length + foodConsumed.length,
        position: [getRandomInt(0, settings.rows), getRandomInt(0, settings.columns)],
        color: WHITE,
    }));
};

Wall = function (settings) {
    if (!(this instanceof Wall)) {
        return new Wall();
    }
    this.position = settings.position;
    this.color = settings.color;
    return this;
};

Player = function (settings) {
    if (!(this instanceof Player)) {
        return new Player();
    }
    this.id = settings.id;
    this.position = settings.position;
    this.color = settings.color;
    this.motion_auto = settings.motion_auto;
    this.motion_direction = settings.motion_direction;
    this.speed_limit = settings.speed_limit;
    this.motion_timestamp = settings.motion_timestamp;
    this.score = settings.score;
    this.name = settings.name;
    return this;
};

Player.prototype.move = function (direction) {

    this.motion_direction = direction;

    ts = Date.now() - start;
    waitTime = 1000 / this.speed_limit;
    if (ts > this.motion_timestamp + waitTime) {

        var newPosition = this.position.slice();

        switch (direction) {
            case "up":
                if (this.position[0] > 0) {
                    newPosition[0] -= 1;
                }
                break;

            case "down":
                if (this.position[0] < settings.rows - 1) {
                    newPosition[0] += 1;
                }
                break;

            case "left":
                if (this.position[1] > 0) {
                    newPosition[1] -= 1;
                }
                break;

            case "right":
                if (this.position[1] < settings.columns - 1) {
                    newPosition[1] += 1;
                }
                break;

            default:
                console.log("Direction not recognized.");

            if (
                settings.player_overlap ||
                (!hasPlayer(newPosition) & !hasWall(newPosition))
            ) {
                this.position = newPosition;
            }
        }
        this.motion_timestamp = ts;
    }
};

clients = [];
food = [];
foodConsumed = [];
players = [];
walls = [];

// Determine whether any player occupies the given position.
function hasPlayer(position) {
    for (var i = 0; i < players.length; i++) {
        if (position == players[i].position) {
            return false;
        }
    }
    return true;
}

// Determine whether any wall occupies the given position.
function hasWall(position) {
    for (var i = 0; i < walls.length; i++) {
        if (position == walls[i].position) {
            return false;
        }
    }
    return true;
}

pixels.canvas.style.marginLeft = (window.innerWidth * 0.03) / 2 + 'px';
pixels.canvas.style.marginTop = (window.innerHeight * 0.04) / 2 + 'px';
document.body.style.transition = '0.3s all';
document.body.style.background = '#ffffff';

var mouse = position(pixels.canvas);

var row, column, rand, color;

pixels.frame(function () {

  // Update the background.
  for (var i = 0; i < data.length; i++) {
      if (settings.background_animation) {
          rand = Math.random() * 0.02;
      } else {
          rand = 0.01;
      }
      background[i] = [
          background[i][0] * 0.95 + rand,
          background[i][1] * 0.95 + rand,
          background[i][2] * 0.95 + rand,
      ];
  }

  data = background;

  // Update the food.
  for (i = 0; i < food.length; i++) {

      // Players digest the food.
      for (var j = 0; j < players.length; j++) {
        if (arraysEqual(players[j].position, food[i].position)) {
            foodConsumed.push(food.splice(i, 1));
            break;
        } else {
             // Draw the food.
            if (settings.food_visible) {
                idx = (food[i].position[0]) * settings.columns + food[i].position[1];
                data[idx] = food[i].color;
            }
        }
      }
  }

  // Update the players' positions.
  players.forEach(function (p) {
      if (p.motion_auto) {
          p.move(p.motion_direction);
      }
      data[(p.position[0]) * settings.columns + p.position[1]] = p.color;
  });

  // Draw the walls.
  if (settings.walls_visible) {
      walls.forEach(function (w) {
          data[(w.position[0]) * settings.columns + w.position[1]] = w.color;
      });
  }

  // Add the Gaussian mask.
  limitVisibility = settings.visibility < Math.max(settings.columns, settings.rows);
  if (limitVisibility && (typeof ego !== 'undefined')) {
      var g = gaussian(0, Math.pow(settings.visibility, 2));
      rescaling = 1 / g.pdf(0);
      for (var i = 0; i < settings.columns; i++) {
          for (var j = 0; j < settings.rows; j++) {
              x = players[ego].position[0];
              y = players[ego].position[1];
              dimness = g.pdf(distance(x, y, i, j)) * rescaling;
              idx = (i * settings.columns + j);
              data[idx] = [
                  data[idx][0] * dimness,
                  data[idx][1] * dimness,
                  data[idx][2] * dimness,
              ];
          }
      }
  }

  pixels.update(data);
});

function distance(x, y, xx, yy) {
    return Math.sqrt((xx-x)*(xx-x) + (yy-y)*(yy-y));
}

start = Date.now();

function arraysEqual(arr1, arr2) {
    for(var i = arr1.length; i--;) {
        if(arr1[i] !== arr2[i])
            return false;
    }
    return true;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

$(document).ready(function() {

    // Consent to the experiment.
    $("#go-to-experiment").click(function() {
        allow_exit();
        window.location.href = '/exp';
    });

    // Submit the questionnaire.
    $("#submit-questionnaire").click(function() {
        submitResponses();
    });

    $("#finish-reading").click(function() {
        $("#stimulus").hide();
        $("#response-form").show();
        $("#submit-response").removeClass('disabled');
        $("#submit-response").html('Submit');
    });

    $("#submit-response").click(function() {
        $("#submit-response").addClass('disabled');
        $("#submit-response").html('Sending...');

        response = $("#reproduction").val();

        $("#reproduction").val("");

        reqwest({
            url: "/info/" + my_node_id,
            method: 'post',
            data: {
                contents: response,
                info_type: "Info"
            },
            success: function (resp) {
                create_agent();
            }
        });
    });

    // Submit the questionnaire.
    $("#submit-questionnaire").click(function() {
        submitResponses();
    });

    if (settings.show_grid) {
        pixels.canvas.style.display = "inline";
    }

    if (settings.chatroom) {
        $("#chat").show();
    }

    $(pixels.canvas).contextmenu(function (e) {
        e.preventDefault();
        donateToClicked(-settings.donation);
    });

    $(pixels.canvas).click(function (e) {
        donateToClicked(settings.donation);
    });

    donateToClicked = function (amt) {
        row = pixels2cells(mouse[1]);
        column = pixels2cells(mouse[0]);
        player_to = nearestPlayer(row, column);
        if (player_to.id != ego) {
            socket.emit('donate', {
                player_to: player_to.id,
                player_from: ego,
                amount: amt,
            });
        }
    };

    pixels2cells = function (pix) {
        return Math.floor(pix / (settings.block_size + settings.padding));
    };

    nearestPlayer = function (row, column) {
        distances = [];
        for (var i = 0; i < players.length; i++) {
            distances.push(
                Math.abs(row - players[i].position[0]) +
                Math.abs(column - players[i].position[1])
            );
        }
        return players[distances.indexOf(Math.min.apply(null, distances))];
    };

    url = location.protocol + '//' + document.domain + ':' + location.port;
    var socket = io.connect(url);

    socket.on('state', function(msg) {

        // Update ego.
        clients = msg.clients;
        ego = clients.indexOf(socket.io.engine.id);

        // Update remaining time.
        remainingTime = Math.max(Math.round(settings.time - msg.remaining_time), 0);
        $("#time").html(remainingTime);

        // Update players.
        state = JSON.parse(msg.state_json);
        for (var i = 0; i < state.players.length; i++) {
            players[state.players[i].id] = new Player(state.players[i]);
        }

        // Update food.
        food = [];
        for (var j = 0; j < state.food.length; j++) {
            food.push(new Food({
                id: state.food[j].id,
                position: state.food[j].position,
                color: WHITE,
            }));
        }

        // Update walls if they haven't been created yet.
        if (walls.length === 0) {
            for (var k = 0; k < state.walls.length; k++) {
                walls.push(new Wall({
                    position: state.walls[k].position,
                    color: state.walls[k].color,
                }));
            }
        }

        // Update displayed score.
        $("#score").html(Math.round(players[ego].score));
        dollars = (players[ego].score * settings.dollars_per_point).toFixed(2);
        $("#dollars").html(dollars);
    });

    socket.on('connect', function(msg) {
        console.log("connected!");
    });

    socket.on('stop', function(msg) {
        $("#game-over").show();
        $("#dashboard").hide();
        $("#instructions").hide();
        $("#chat").hide();
        pixels.canvas.style.display = "none";
    });

    $("form").submit(function(){
        socket.emit("message", {
            "contents": $("#message").val(),
            "player_id": ego,
            "timestamp": Date.now() - start,
        });
        $("#message").val("");
        return false;
    });

    socket.on("message", function(msg){
      if (settings.pseudonyms) {
          name = players[msg.player_id].name;
      } else {
          name = "Player " + msg.player_id;
      }
      entry = "<span class='name'>" + name + ":</span> " + msg.contents;
      $("#messages").append($("<li>").html(entry));
      $('#chatlog').scrollTop($('#chatlog')[0].scrollHeight);
    });

    socket.on("donate", function(msg){
      entry = "Player " + msg.player_from + " gave you " + msg.donation;
      if (msg.donation == 1) {
        entry += " point.";
      } else {
        entry += " points.";
      }
      $("#messages").append($("<li>").html(entry));
      $('#chatlog').scrollTop($('#chatlog')[0].scrollHeight);
    });

    //
    // Key bindings
    //
    directions = ["up", "down", "left", "right"];
    lock = false;
    directions.forEach(function (direction){
        Mousetrap.bind(direction, function () {
            if (!lock) {
                players[ego].move(direction);
                socket.emit('move', {
                    player: players[ego].id,
                    move: direction,
                });
            }
            lock = true;
            return false;
        });
        Mousetrap.bind(direction, function () {
            lock = false;
            return false;
        }, "keyup");
    });

    if (settings.mutable_colors) {
        Mousetrap.bind("b", function () {
            players[ego].color = BLUE;
            socket.emit('change_color', {
                player: players[ego].id,
                color: BLUE,
            });
        });

        Mousetrap.bind("y", function () {
            players[ego].color = YELLOW;
            socket.emit('change_color', {
                player: players[ego].id,
                color: YELLOW,
            });
        });
    }
});