// config/passport.js

// load all the things we need
var LocalStrategy   = require('passport-local').Strategy;

//used to load aws users
var AWS = require('aws-sdk');
//set region
AWS.config.region = 'sa-east-1';

// load up the user model
var User            = require('../app/models/user');
// constants
var Constants       = require('./constants');

// expose this function to our app using module.exports
module.exports = function(passport) {

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });

    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-signup', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, email, password, done) {

        // asynchronous
        // User.findOne wont fire unless data is sent back
        process.nextTick(function() {

        // find a user whose email is the same as the forms email
        // we are checking to see if the user trying to login already exists
        User.findOne({ 'email' :  email }, function(err, user) {
            // if there are any errors, return the error
            if (err)
                return done(err);

            // check to see if theres already a user with that email
            if (user) {
                return done(null, false, {error : 'This email is already taken'});
            } else {

                // if there is no user with that email
                // create the user
                var newUser            = new User();

                // set the user's local credentials
                newUser.email    = email;
                newUser.password = newUser.generateHash(password);
                newUser.usertype = req.body.usertype;
                if(req.body.username){ //optional
                    newUser.username = req.body.username;
                }

                //aws //request for the admin access keys
                //rewrite to attach user to group and attach policies to the right s3 folder
                var iam = new AWS.IAM({accessKeyId : req.user.keycred, secretAccessKey : req.user.keypasscred});
                var params = {
                    UserName: newUser.email /* required */
                };
                iam.createUser(params, function (uerr, user) {
                    if (uerr) 
                        console.log(uerr, uerr.stack); // an error occurred
                    else
                    {
                        //create access keys
                        //params already created
                        iam.createAccessKey(params, function(kerr, keys) {
                            if (kerr) 
                                console.log(kerr, kerr.stack); // an error occurred
                            else     
                            {
                                //set the user's aws credentials
                                newUser.keycred = keys.AccessKey.AccessKeyId;
                                newUser.keypasscred = keys.AccessKey.SecretAccessKey;
                                // save the user
                                newUser.save(function(nuerr) {
                                    if (nuerr)
                                        throw nuerr;
                                    return done(null, newUser);
                                });
                            }
                        });
                    }    
                        
                });
            }

        });    

        });

    }));

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-login', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, email, password, done) { // callback with email and password from our form

        // find a user whose email is the same as the forms email
        // we are checking to see if the user trying to login already exists
        User.findOne({ 'email' :  email }, function(err, user) {
            // if there are any errors, return the error before anything else
            if (err)
                return done(err);

            // if no user is found, return the message
            if (!user)
                return done(null, false, {error : 'User not found'}); // req.flash is the way to set flashdata using connect-flash

            // if the user is found but the password is wrong
            if (!user.validPassword(password))
                return done(null, false, {error : 'Wrong password'}); // create the loginMessage and save it to session as flashdata

            // all is well, return successful user
            return done(null, user);
        });

    }));

};