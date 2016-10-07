// app/models/user.js
// load the things we need
var mongoose = require('mongoose')
  , Schema = mongoose.Schema;
var bcrypt   = require('bcrypt-nodejs');
var crypto   = require('crypto');

//variables for encryption/decryption
var algorithm = 'aes256'; // or any other algorithm supported by OpenSSL
var key = '85GfBXSjHGvqnKg4'; // generated key

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
    keypasscred : String,
    //projects that this user is related to
    projects : [{type : Schema.Types.ObjectId, ref : 'Project'}], //added after user creation
    available_work_load : { type : Number, required : true },
    possible_roles : [{type : String}] //added after user creation
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

// encrypt
userSchema.methods.encryptText = function(text) {
    var cipher = crypto.createCipher(algorithm, key);  
    return cipher.update(text, 'utf8', 'hex') + cipher.final('hex'); //encrypted text
};

// decrypt 
userSchema.methods.decryptText = function(text) {
    var decipher = crypto.createDecipher(algorithm, key);
    return decipher.update(text, 'hex', 'utf8') + decipher.final('utf8'); //decrypted text
};

// create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);