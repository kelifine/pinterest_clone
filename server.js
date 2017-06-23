'use strict';

var express = require('express');
var mongoose = require('mongoose');
var passport = require('passport');
var routes = require('./app/routes/index.js');
var session = require('express-session');

var app = express();
require('dotenv').load();
require('./app/config/passport')(passport);
var http = require('http').Server(app);
var io = require('socket.io')(http);

mongoose.connect(process.env.MONGO_URI);
mongoose.Promise = global.Promise;

app.use('/public', express.static(process.cwd() + '/public'));


app.use(session({
	secret: 'spo',
	resave: false,
	saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

routes(io, app, passport);

var port = process.env.PORT || 8080;
http.listen(port,  function () {
	console.log('Node.js listening on port ' + port + '...');
});
io = io.listen(http);
