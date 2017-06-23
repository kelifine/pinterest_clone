var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Spot = new Schema({
    link: String,
    name: String,
    likes: Array,
    spotters: Array,
    owner: String
});

module.exports = mongoose.model('Spot', Spot);
