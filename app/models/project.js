// app/models/user.js
// load the things we need
var mongoose = require('mongoose')
  , Schema = mongoose.Schema;
var bcrypt   = require('bcrypt-nodejs');

//models
//var Portfolio = require('./portfolio');

//validation
//var validate = require('mongoose-validate');

// define the schema for the program model
var projectSchema = mongoose.Schema({

	name : { type: String, required: true},
	description : { type: String, required: true},
	human_resources : [{type : Schema.Types.ObjectId, ref : 'User'}],
	total_value : { type: Number, required: true},
	available_value : { type: Number, required: true},
	status : {type : Number, required : true},
	//valor_agregado : { type: String, required: true}

});

// create the model for program and expose it to our app
module.exports = mongoose.model('Project', projectSchema);