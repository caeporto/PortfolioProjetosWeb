// app/models/user.js
// load the things we need
var mongoose = require('mongoose')
  , Schema = mongoose.Schema;
var bcrypt   = require('bcrypt-nodejs');

//models
var Project = require('./project');

//validation
//var validate = require('mongoose-validate');

//andamento, cancelado, finalizado, suspenso

// define the schema for the program model
var programSchema = mongoose.Schema({

	name : { type: String, require: true},
	description : { type: String, required: true},
    //required
    projects : [{type : Schema.Types.ObjectId, ref : 'Project', required : true}],
    manager : {type : Schema.Types.ObjectId, ref : 'User', required : true},
    total_value : {type : Number, required : true},
    status : {type : Number, required : true},
    category : { type: String, require: true},
    begin_date : {type : Date, required : true},
	end_date : {type : Date, required : true}
});

// create the model for program and expose it to our app
module.exports = mongoose.model('Program', programSchema);
