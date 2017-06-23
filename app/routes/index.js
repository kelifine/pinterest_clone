'use strict';
var pug = require('pug');
var path = require('path');
var bodyParser = require('body-parser');
var User = require('../models/users.js');
var Spot = require('../models/spots.js');

module.exports = function (io, app, passport) {
	
app.use(bodyParser.urlencoded({ extended: true }));	

var header, spotter, hearts;
var spots = [];
var allspots = [];

	function isLoggedIn (req) {
		if (req.isAuthenticated()) {
			spotter=req.user.twitter.username;
			header = pug.renderFile(path.join(__dirname, '../../pug/auth.pug'), {user: spotter});
		} else {
			header = pug.renderFile(path.join(__dirname, '../../pug/unauth.pug'));
		}
	}
	
	function mySpots (callback) {
		Spot.find({owner: spotter}, function (err, spots)  {
			if (err) return console.log(err);
			console.log(spots);
			callback();
		});
			callback();
	}
	
	function allSpots(callback) {
		
	}


	app.route('/')
		.get(function(req,res) {
			isLoggedIn(req);
			var home = pug.renderFile(path.join(__dirname, '../../pug/home.pug'));
			res.send(header+home);
		});

	app.route('/auth/twitter') 
		.get(passport.authenticate('twitter'));
		
	app.route('/auth/twitter/callback') 
 		.get(passport.authenticate('twitter', {
			successRedirect: '/',
			failureRedirect: '/login'
		}));	
		
	app.route('/mySpots')
		.get(function(req,res) {
			mySpots(function() {
			var mine = pug.renderFile(path.join(__dirname, '../../pug/myspots.pug'), {pictures: spots});
			res.send(mine);
			spots = [];
			});
		});
	
	app.route('/allSpots')
		.get(function(req,res) {
			isLoggedIn(req);
			allSpots(function() {
			var all = pug.renderFile(path.join(__dirname, '../../pug/allspots.pug'), {spots: allspots});
			res.send(header+all);
			});
		});	
		
	io.on('connection', function(socket){
			console.log('a user connected');
		socket.on('spotted', function(title, url) {
				var newSpot = new Spot();
				newSpot.link = url;
				newSpot.name = title;
				newSpot.likes = [];
				newSpot.spotters = [];
				newSpot.owner = spotter; 
				newSpot.save();
				allspots.push(newSpot);
			});
		socket.on('removePic', function(remove) {
			User.findOne({username: spotter}, function(err, user) {
				if (err) return console.log(err);
				for (var i = 0; i<user.spots.length; i++) {
					if (user.spots[i].link===remove) {
						user.spots.splice(i,1);
						user.markModified('spots');
						user.save();
					}
				}
			});
		});
		socket.on('addlike', function(thispic) {
			User.findOne({ 'spots.link': thispic }, function(err, user) {
				if (err) return console.log(err);
				for (var i=0; i<user.spots.length; i++) {
					if (user.spots[i].link === thispic) {
						var index = user.spots[i].likes.indexOf(spotter);
							if (user.spots[i].likes.indexOf(spotter)!==-1) {
								user.spots[i].likes.splice(index, 1);
								hearts = -1;
							}
							else if (user.spots[i].likes.indexOf(spotter)===-1) {
								user.spots[i].likes.push(spotter);
								hearts = 1;
						} 
						user.markModified('spots');
						user.save();
						socket.emit('addlike', hearts, thispic);
					}
				}
			});
		});
	});
	
};