// app/models/user.js
// load the things we need
var mongoose = require('mongoose')
  , Schema = mongoose.Schema;
var bcrypt   = require('bcrypt-nodejs');

//models

//validation
//var validate = require('mongoose-validate');

// define the schema for our user model
var userSchema = mongoose.Schema({
    //required
    email : { type: String, required: true /*,validate: [validate.email, 'Invalid email address']*/ },
    password : { type : String, required : true },
    //required
    usertype : { type : Number, required : true },
    //username not required
    username : String,
    //aws credentials
    keycred : String,
    keypasscred : String
    //projects that this user is related to
    projects : [{type : Schema.Types.ObjectId, ref : 'Project'}]
});

// methods ======================
// generating a hash
userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};

// create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);