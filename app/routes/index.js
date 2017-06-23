'use strict';
var pug = require('pug');
var path = require('path');
var bodyParser = require('body-parser');
var User = require('../models/users.js');
var Spot = require('../models/spots.js');

module.exports = function (io, app, passport) {
	
app.use(bodyParser.urlencoded({ extended: true }));	


var header, spotter, hearts, status;
var userspots = [];
var allspots = [];

	function isLoggedIn (req) {
		if (req.isAuthenticated()) {
			spotter=req.user.twitter.username;
			header = pug.renderFile(path.join(__dirname, '../../pug/auth.pug'), {user: spotter});
			status='loggedin';
		} else {
			header = pug.renderFile(path.join(__dirname, '../../pug/unauth.pug'));
			status='notloggedin';
		}
	}
	
	function userSpots (name, callback) {
		Spot.find({owner: name}, function (err, spots)  {
			if (err) return console.log(err);
			spots.forEach(function(spot) {
				userspots.push(spot);
			});
			callback();
		});
	}
	
	function allSpots(callback) {
		Spot.find({}).sort('-date').exec(function(err, spots){
			if (err) return console.log(err);
			spots.forEach(function(spot) {
				allspots.push(spot);
			});
			console.log(allspots);
			callback();
	});
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
			userSpots(spotter, function() {
			var mine = pug.renderFile(path.join(__dirname, '../../pug/myspots.pug'), {user: spotter, pictures: userspots});
			res.send(mine);
			userspots = [];
			});
		});
	
	app.route('/allSpots')
		.get(function(req,res) {
			isLoggedIn(req);
			allSpots(function (){
				var all = pug.renderFile(path.join(__dirname, '../../pug/allspots.pug'), {spots: allspots, header: "All"});
			res.send(header+all);	
			});
			allspots=[];
		});	
		
	app.route('/:name')
		.get(function(req,res) {
			var name = req.path.substr(1);
			userSpots(name, function() {
			var somespots = pug.renderFile(path.join(__dirname, '../../pug/allspots.pug'), {spots: userspots, header: name+"'s"});
			res.send(header+somespots);
			userspots = [];
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
			});
		socket.on('removePic', function(remove) {
			Spot.remove({link: remove, owner: spotter}, function (err) {
				if (err) return console.log(err);
			});
		});
		socket.on('addlike', function(thispic) {
			Spot.findOne({ link: thispic }, function(err, spot) {
				if (err) return console.log(err);
						var index = spot.likes.indexOf(spotter);
							if (spot.likes.indexOf(spotter)!==-1) {
								spot.likes.splice(index, 1);
								hearts = -1;
							}
							else if (spot.likes.indexOf(spotter)===-1) {
								spot.likes.push(spotter);
								hearts = 1;
						} 
						spot.markModified('likes');
						spot.save();
						socket.emit('addlike', hearts, thispic);
			});
		});
		socket.on('savespot', function(title, thispic) {
			if(status ==='loggedin') {	
				
				Spot.find({link: thispic}, function(err, spots) {
					if (err) return console.log(err);
					spots.forEach(function(spot) {
						spot.spotters.push(spotter);
					});
				});
				var newSpot = new Spot();
				newSpot.link = thispic;
				newSpot.name = title;
				newSpot.likes = [];
				newSpot.spotters = [];
				newSpot.owner = spotter; 
				newSpot.save();
				var length = newSpot.spotters.length;
				socket.emit('savespot', length, thispic);
			}
			else {
				socket.emit('notloggedin');	
			}
		});
	});
	
};