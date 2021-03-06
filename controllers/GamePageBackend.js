var models = require('../models');
var Game = models.Game;
// p1 plays in the browser
//p2 is the computer

// Get JSON view of all the games currently in DB
// probably not necessary in production: might make this depend on process.env.NODE_ENV
function index(req, res) {
  Game.find({}, function(err, game){
    if (err) {
      res.send(err);
    } else {
      res.json(game);
    };
  });
};

function allRowColumnPossibilities(gridSize) { // creates all array possibilities with [row, column] (if 5x5, gridSize = 5)
  let numberPossibilitiesArray = Array.from(Array(gridSize).keys());
  let allPossibilities = [];
  numberPossibilitiesArray.map(oneRow => {
    numberPossibilitiesArray.map(oneColumn => {
      allPossibilities.push([oneRow, oneColumn]);
    });
  });
  return allPossibilities;
};

function chooseUniqueShips(gridSize, shipCount) { // chooses unique arrays [row, column], loop runs shipCount times
  let allPossibilities = allRowColumnPossibilities(gridSize);
  let ships = [];
  for (let i = 0; i < shipCount; i++) {
    let randomIdx = Math.floor(Math.random() * allPossibilities.length);
    element = allPossibilities[randomIdx];
    ships.push(element);
    allPossibilities.splice(randomIdx, 1); //cuts element from allPossibilities array so no duplicate ships can be generated
  };
  return ships
};

function isEqual(positions, guess) { // checks the equality of an array with 2 elements: [1,2] and [1,2] => true
  return positions[0] === guess[0] && positions[1] === guess[1];
};

function isHit(positionsArray, guess) { // checks if guess is in opposite player's ship positions array
  // if you wanted, could use positionsArray.any here instead
  for(let i = 0; i < positionsArray.length; i++) {
    let oneItem = positionsArray[i];
    if (isEqual(oneItem, guess)) {
      return true
    };
  };
  return false
};

function pickRandomElement(possibilitiesArray) {
  let randomIdx = Math.floor(Math.random() * possibilitiesArray.length);
  let element = possibilitiesArray[randomIdx];
  return element;
};

function removeFromP2Guesses(guesses, guess) {
  var filteredGuesses = guesses.filter((eachGuess, idx) => {
    return !isEqual(eachGuess, guess)
  });
  return filteredGuesses;
};

function create(req, res) {// Add new Game to DB on 'Enter' click
  let p2ShipLocations = chooseUniqueShips(10, 17); // creates ships locations for p2_positions
  let game = new Game ({
    p2_positions: p2ShipLocations,
    p2_guesses: allRowColumnPossibilities(10)
  })
  game.save(function (err, game) {
    if (err) {
      res.send(err);
    } else {
      res.json(game);
    }
  });
};

function locationForShip(length) {
  let horiz = Math.random() > 0.5; // randomly true or false
  if (horiz) {
    let col = Math.floor(Math.random() * (10-length + 1));
    let row = Math.floor(Math.random() * 10);
    let ans = [[row, col]];
    for (let i = 1; i < length; i++) {
      ans.push([row, col + i])
    }
    return ans;
  } else {
    let row = Math.floor(Math.random() * (10-length + 1));
    let col = Math.floor(Math.random() * 10);
    let ans = [[row, col]];
    for (let i = 1; i < length; i++) {
      ans.push([row + i, col])
    }
    return ans;
  }
}

// pseudocode:
// find location for ship 5
// add that location to our locations
// find location for ship 4
// while that new location intersects w/ ships already there:
//    find new location
// add new location to our locations
// repeat for other lengths

// locationForShip(4) => [ [0,0], [0,1], [0,2], [0,3] ]

function show(req, res) { // select a game by id
  Game.findOne({_id: req.params.game_id}, function(err, foundGame){
    if (err) {res.send(err);}
    else {res.json(foundGame);}
  });
};

function update(req, res) {
  Game.findOne({_id: req.params.game_id}, function(err, foundGame){
    if (err) {
      res.send(err);
      return;
    }
    let guess = req.body.p1_guesses;
    let p2Play = req.body.computerPlay;
    if (guess) { // one guess has been entered
      let foundGameP2Pos = foundGame.p2_positions;
      if (isHit(foundGameP2Pos, guess)) { // save the hit
        foundGame.p1_guesses = guess;
        foundGame.p1_hits = (foundGame.p1_hits + 1); // increment p1_hits by 1
        foundGame.save(function(err, saved){
          res.send(true);
        });
      } else {
        res.send(false);
      };
    } else if (p2Play) { // triggers p2 turn if req.body includes computerPlay: true
      computerGuessHelper(foundGame, res);
    } else { // when user presses play game button, saves initial positions
      foundGame.p1_positions = req.body.p1_positions,
      foundGame.save(function(err, saved) {
        if(err) { console.log('error', err); }
        res.json(saved);
      });
    };
  });
};

function computerGuessHelper(foundGame, res) {
  let p2RandomGuess = pickRandomElement(foundGame.p2_guesses); //selects a random guess for p2
  console.log("Random guess ", p2RandomGuess)
  let doesHitmatch = isHit(foundGame.p1_positions, p2RandomGuess);
  console.log(doesHitmatch)
  if (doesHitmatch) { // if the random guess matches p1_positions
    foundGame.p2_hits = (foundGame.p2_hits + 1);
    foundGame.p2_guesses = removeFromP2Guesses(foundGame.p2_guesses, p2RandomGuess);
    console.log(foundGame.p2_guesses)//remove from guesses so the guess will never repeat
    let response = [p2RandomGuess, 'match']; // match is included currently to differentiate in FE if it was a hit
    foundGame.save(function(err, saved){
      res.json(response);
    });
  } else {
      foundGame.p2_guesses = removeFromP2Guesses(foundGame.p2_guesses, p2RandomGuess);
      foundGame.save(function(err, saved){
        res.json(p2RandomGuess);
      });
  };
}
function computerGuess(req, res) {
  // do computer guess steps here
  // generate computer's guess
  // send back the guess the computer made
}

function destroy(req, res) {
  Game.findByIdAndRemove(req.params.game_id, function(err, deletedGame) {
    if(err) {
      res.send(err);
      console.log("Delete error occurred", err);
    } else {
      res.send(200, `game with ID: ${req.params.game_id} was deleted!`);
    };
  });
};

module.exports.index = index;
module.exports.create = create;
module.exports.show = show;
module.exports.update = update;
module.exports.destroy = destroy;
module.exports.computerGuess = computerGuess;
