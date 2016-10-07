// app/models/user.js
// load the things we need
var mongoose = require('mongoose')
  , Schema = mongoose.Schema;

//models
var User = require('./user');
var Program = require('./program');
var Project = require('./project');


//validation
//var validate = require('mongoose-validate');

// define the schema for the portfolio model
var portfolioSchema = mongoose.Schema({
    //required
    description : { type: String, required : true},
    programs : [{type : Schema.Types.ObjectId, ref : 'Program'}],
    projects : [{type : Schema.Types.ObjectId, ref : 'Project'}],
    human_resources : [{type : Schema.Types.ObjectId, ref : 'User'}],
    total_value : {type : Number, required : true},
    possible_roles : [{type : String, required : true}]
});

// create the model for portfolio and expose it to our app
module.exports = mongoose.model('Portfolio', portfolioSchema);