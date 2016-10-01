//native modules
var async = require('async');
//models
var User = require('./models/user');
//var Portfolio = require('./models/portfolio');
var Program = require('./models/program');
var Project = require('./models/project');
//constants
var Constants = require('../config/constants');
//used to s3 operations
var AWS = require('aws-sdk');
//set region
AWS.config.region = 'sa-east-1';

// route middleware to make sure an user is logged in
function isUserLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
        return next();

    // if the user is not, 401 unauthorized
    res.sendStatus(401);
}

module.exports = function(app, passport) {

	app.post('/login/createprogram', isUserLoggedIn, function(req, res){
        if(req.user.usertype === Constants.PROJECT_MANAGER || req.user.usertype === Constants.PORTFOLIO_MANAGER){
            Program.findOne({_id : req.user._id}, function(perr, program){
                if(perr)
                    res.send(serr);
                else if(program)
                    res.status(404).send('Error');
                else{
                    //!user
                    var new_program = new Program(req.body);

                    new_program.save(function(nperr, program) {
                        if (nperr)
                            throw nperr;
                        res.status(200).send(program);
                    });
                }
            });
        }
        else
            res.sendStatus(401); //unauthorized
	});

	app.post('/login/createproject', isUserLoggedIn, function(req, res){
        if(req.user.usertype === Constants.PROJECT_MANAGER || req.user.usertype === Constants.PORTFOLIO_MANAGER){
            Project.findOne({_id : req.user._id}, function(perr, project){
                if(perr)
                    res.send(serr);
                else if(project)
                    res.status(404).send('Error');
                else{
                    //!user
                    var new_project = new Project(req.body);

                    //create the project group
                    var iam = new AWS.IAM({accessKeyId : req.user.keycred, secretAccessKey : req.user.keypasscred});
                    var params = {
                        GroupName: new_project.name /* required */
                    };
                    iam.createGroup(params, function(err, data) {
                        if (err) 
                            console.log(err, err.stack); // an error occurred
                        else {

                            //attach policy to group allowing read-write only to the project's folder in s3
                            var params = {
                                GroupName: data.GroupName, /* required */
                                PolicyArn: 'arn:aws:s3:::'+Constants.BUCKET+'/'+data.GroupName+'/*' /* required */
                            };
                            iam.attachGroupPolicy(params, function(err, data) {
                                if (err) 
                                    console.log(err, err.stack); // an error occurred
                                else {
                                    //if there's any users already related to this project, e.g. recursos_humanos
                                    //attach the users to the iam group, use async each
                                    if(new_project.human_resources.length > 0)
                                    {
                                        async.each(new_project.human_resources, function(user_id, callback) {

                                            User.findOne({_id : user_id}, function(err, user){
                                                if(err)
                                                    callback(err);
                                                else
                                                {
                                                    var params = {
                                                        GroupName: new_project.name, /* required */
                                                        UserName: user.email /* required */
                                                    };
                                                    iam.addUserToGroup(params, function(err, data) {
                                                        if (err) 
                                                            callback(err);
                                                        else 
                                                            callback();
                                                    });
                                                }
                                            });

                                        }, function(err){
                                            if(err){
                                                res.status(404).send(err);
                                            }
                                            else
                                            {
                                                //last but not least create the bucket folder
                                                var s3 = new AWS.S3();

                                                var params = { Bucket: Constants.BUCKET, Key: new_project.name + '/', Body: '' };

                                                s3.upload(params, function (err, data) {
                                                    if (err) {
                                                        console.log("Error creating the folder: ", err);
                                                    } else {
                                                        console.log("Successfully created a folder on S3");
                                                        new_project.save(function(nperr, project) {
                                                            if (nperr)
                                                                throw nperr;
                                                            res.status(200).send(project);
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    }
                                    else
                                    {
                                        //last but not least create the bucket folder
                                        var s3 = new AWS.S3();

                                        var params = { Bucket: Constants.BUCKET, Key: new_project.name + '/', Body: '' };

                                        s3.upload(params, function (err, data) {
                                            if (err) {
                                                console.log("Error creating the folder: ", err);
                                            } else {
                                                console.log("Successfully created a folder on S3");
                                                new_project.save(function(nperr, project) {
                                                    if (nperr)
                                                        throw nperr;
                                                    res.status(200).send(project);
                                                });
                                            }
                                        });
                                    }
                                }
                            });
                        }  
                    });
                }
            });
        }
        else
            res.sendStatus(401); //unauthorized
	});

	//only the admin is able to register a new user
    app.post('/login/signup', function(req, res, next){  
        if(req.isAuthenticated())
            if(req.user.usertype === Constants.PORTFOLIO_MANAGER)
                return next();
        // if the user is not, 401 unauthorized
        res.sendStatus(401);

    }, passport.authenticate('local-signup'), function(req, res) {
    	res.sendStatus(200);
    });

	app.post('/login', passport.authenticate('local-login'), function(req, res) {
    	res.status(200).send(req.user);
    });

};