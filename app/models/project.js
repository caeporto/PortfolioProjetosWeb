// app/models/user.js
// load the things we need
var mongoose = require('mongoose')
  , Schema   = mongoose.Schema;
var async 	 = require('async');

//models
var Portfolio = require('./portfolio');

//validation
//var validate = require('mongoose-validate');

//status do projeto
//pendente 0 (aprovação estratégica (diretor )termo de abertura), pendente 1 (aprovação do gerente de portfolio), andamento 2 - cancelado 3
//																													    	  - suspenso 4 - cancelado ou andamento
//																													    	  - finalizado 5

// define the schema for the program model
var projectSchema = mongoose.Schema({
	name : { type: String, required: true},
	description : { type: String, required: true},
	//termo de abertura
	human_resources : [{type : Schema.Types.ObjectId, ref : 'User'}],
	manager : {type : Schema.Types.ObjectId, ref : 'User', required : true},
	total_value : {type: Number, required: true},
	available_value : { type: Number, required: true},
	status : {type : Number, required : true},
	category : { type: String, require: true},
	work_load : {type : Number, required : true},
	project_roles : [{type : String, required : true}],
	project_files : [{type : String}],
	begin_date : {type : Date, required : true},
	end_date : {type : Date, required : true},
	approved_one : {type : Boolean},
	approved_two : {type : Boolean}
});

projectSchema.methods.validateProjectRoles = function (portfolio_m, async_m, validcallback) {
	portfolio_m.find({}, function(perr, port_documents){
		if(perr)
			validcallback(false);
		else if(port_documents.length == 0)
			validcallback(false);
		else
		{
			var portfolio = port_documents[0];
			async_m.each(this.project_roles, function(role, callback){
				if(!portfolio.possible_roles.includes(role)) //module.exports in portfolio
					callback(new Error());
				else 
					callback(null);
				}, function(err){
					if(err)
						validcallback(false);
					else
						validcallback(true);
			});
		}
	});
};

// create the model for program and expose it to our app
module.exports = mongoose.model('Project', projectSchema);
