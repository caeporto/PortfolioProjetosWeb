//native modules
var async = require('async');
//models
var User = require('./models/user');
var Portfolio = require('./models/portfolio');
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

function s3GroupPolicy(bucket, arn) {
return  { 
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "AllowAllS3ActionsInUserFolder",
                    "Effect": "Allow",
                    "Action": [
                        "s3:*"
                    ],
                    "Resource": [
                        "arn:aws:s3:::"+bucket+"/"+arn+"/*"
                    ]
                }
            ]
        }
}

// parse a date in yyyy-mm-dd format
// if a project begins at 2016-10-13, then the initial day will be 2016-10-12 00:00 
// if a project ends at 2016-10-13, then the final day will be 2016-10-14 00:00 (turning 00:00)
function parseDate(input, begin) {
  var parts = input.split('-');
  // new Date(year, month [, day [, hours[, minutes[, seconds[, ms]]]]])
  if(begin)
      return new Date(parts[0], parts[1]-1, parts[2]);
  else
      return new Date(parts[0], parts[1]-1, (parseInt(parts[2],10)+1).toString()); // Note: months are 0-based
}

module.exports = function(app, passport) {

    // app.get('/login/projectfindsuggestions/:category/:workload', function(req, res){

    // });

    // //find suggestions using a basic set of variables
    // app.get('/login/findsuggestions/', function(req, res){

    // });

    app.get('/login/getprograms/:skip/:limit', isUserLoggedIn, function(req, res){
        Program.find({}, {'total_value' : 0}).skip(parseInt(req.params.skip, 10)).limit(parseInt(req.params.limit, 10)).exec(function(err, programs){
            if(err)
                res.send(err);

            async.each(programs, function(program, callback){

                Project.find({'_id' : { $in : program.projects}}, {'total_value' : 0, 'available_value' : 0, 'project_files' : 0}, function(err, projects){
                    if(err)
                        res.send(err);

                    async.each(projects, function(project, callback){

                        User.find({ '_id': { $in : project.human_resources}}, {'email' : 1, 'username' : 1}, function(err, users){
                            if(err)
                                callback(err);
                            else
                            {
                                project.human_resources = users;
                                User.findOne({ '_id' : project.manager}, {'email' : 1, 'username' : 1}, function(err, user){
                                    if(err)
                                        callback(err);
                                    else
                                    {
                                        project.manager = user;
                                        projects[projects.indexOf(project)] = project;
                                        callback();
                                    }
                                });
                            }
                        });

                    }, function(err){
                        if(err)
                            res.send(err);
                        else
                        {
                            program.projects = projects;
                            programs[programs.indexOf(program)] = program;
                            callback();
                        } 
                    });
                });

            }, function(err){
                if(err)
                    res.send(err);
                else
                {
                    res.status(200).send(programs);
                } 
            });
        });
    });

    app.get('/login/getprojects/:skip/:limit', isUserLoggedIn, function(req, res){
        Project.find({}, {'total_value' : 0, 'available_value' : 0, 'project_files' : 0}).skip(parseInt(req.params.skip, 10)).limit(parseInt(req.params.limit, 10)).exec(function(err, projects){
            if(err)
                res.send(err);

            async.each(projects, function(project, callback){

                User.find({ '_id': { $in : project.human_resources}}, {'email' : 1, 'username' : 1}, function(err, users){
                    if(err)
                        callback(err);
                    else
                    {
                        project.human_resources = users;
                        User.findOne({ '_id' : project.manager}, {'email' : 1, 'username' : 1}, function(err, user){
                            if(err)
                                callback(err);
                            else
                            {
                                project.manager = user;
                                projects[projects.indexOf(project)] = project;
                                callback();
                            }
                        });
                    }
                });

            }, function(err){
                if(err)
                    res.send(err);
                else
                {
                    res.status(200).send(projects);
                } 
            });
        });
    });

    //upload file
    app.post('/login/uploadfile/:projectid', isUserLoggedIn, function(req, res){
        if(req.user.usertype === Constants.PORTFOLIO_MANAGER){
            Project.findOne({ '_id' : req.params.projectid}, function(err, project){
                if(err)
                    res.send(err);
                else
                {
                    if(project.manager.toString().valueOf() == (req.user._id.valueOf()))
                    {
                        if (req.busboy) {
                            var admin_key = req.user.decryptText(req.user.keycred);
                            var admin_passkey = req.user.decryptText(req.user.keypasscred);
                            AWS.config.update({accessKeyId: admin_key, secretAccessKey: admin_passkey});
                            var uploadedS3 = false;

                            req.busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
                                //console.log('File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype);
                                var s3 = new AWS.S3({
                                    params: {Bucket: Constants.BUCKET, Key: project.name + '/' + filename, Body: file},
                                    options: {partSize: 5 * 1024 * 1024, queueSize: 10}   // 5 MB concurrency 10
                                });
                                s3.upload().on('httpUploadProgress', function (evt) {
                                    //res.json({ progress : parseInt((evt.loaded * 100) / evt.total) });
                                    //console.log("Uploaded: " + parseInt((evt.loaded * 100) / evt.total)+'%');
                                }).send(function (err, data) {
                                    project.project_files.push(data.Location);
                                    project.save(function(nperr, new_project) {
                                        if (nperr)
                                            throw nperr;
                                        res.status(200).send(new_project);
                                    });
                                });
                            });
                            req.busboy.on('finish', function() {
                                //
                            });
                            req.pipe(req.busboy);
                        }
                    }
                    else
                    {
                        res.sendStatus(401); //unauthorized
                    }
                }
            });
        }
        else
            res.sendStatus(401); //unauthorized
    });

    //update portfolio with new info
    app.put('/login/updateportfolio', isUserLoggedIn, function(req, res){
        if(req.user.usertype === Constants.PORTFOLIO_MANAGER){
            Portfolio.update({}, req.body, function(perr, portfolio){
                if(perr)
                    res.send(serr);
                else
                {
                    res.sendStatus(200);
                }
                
            });
        }
        else
            res.sendStatus(401); //unauthorized
    });

    //check if theres a portfolio created if there is don't do anything otherwise create one
    app.post('/login/createportfolio', isUserLoggedIn, function(req, res){
        if(req.user.usertype === Constants.PORTFOLIO_MANAGER){
            Portfolio.find({}, function(perr, port_documents){
                if(perr)
                    res.send(serr);
                else if(port_documents.length > 0)
                {
                    res.sendStatus(200);
                }
                else
                {
                    var portfolio = new Portfolio(req.body);
                    portfolio.save(function(nperr, new_portfolio) {
                        if (nperr)
                            throw nperr;
                        res.status(200).send(new_portfolio);
                    });
                }
                
            });
        }
        else
            res.sendStatus(401); //unauthorized
    });

    //update program with new info
    app.put('/login/updateprogram', isUserLoggedIn, function(req, res){
        if(req.user.usertype === Constants.PORTFOLIO_MANAGER){
            Portfolio.update({}, req.body, function(perr, portfolio){
                if(perr)
                    res.send(serr);
                else
                {
                    res.sendStatus(200);
                }
                
            });
        }
        else
            res.sendStatus(401); //unauthorized
    });

	app.post('/login/createprogram', isUserLoggedIn, function(req, res){
        if(req.user.usertype === Constants.PROJECT_MANAGER || req.user.usertype === Constants.PORTFOLIO_MANAGER){
            Program.findOne({_id : req.user._id}, function(perr, program){
                if(perr)
                    res.send(serr);
                else if(program)
                    res.status(404).send('Error');
                else{
                    
                    //String to Date
                    req.body.begin_date = parseDate(req.body.begin_date, true); 
                    req.body.end_date = parseDate(req.body.end_date, false);
                    var new_program = new Program(req.body);

                    new_program.save(function(nperr, program) {
                        if (nperr)
                            throw nperr;
                        Portfolio.find({}, function(perr, port_documents){
                            if(perr)
                                res.send(serr); 
                            else
                            {
                                var portfolio = port_documents[0];
                                portfolio.programs.push(program);

                                portfolio.save(function(porterr){
                                    if(porterr)
                                        res.send(serr); 
                                    else
                                    {
                                        res.status(200).send(program);
                                    }
                                });
                            }
                        });
                    });
                }
            });
        }
        else
            res.sendStatus(401); //unauthorized
	});

	app.post('/login/createproject', isUserLoggedIn, function(req, res){
        if(req.user.usertype === Constants.PROJECT_MANAGER || req.user.usertype === Constants.PORTFOLIO_MANAGER){
            Portfolio.find({}, function(perr, port_documents){
                if(perr)
                    res.send(serr); 
                else
                {
                    var portfolio = port_documents[0];

                    Project.findOne({ name : req.body.name }, function(perr, project){
                        if(perr)
                            res.send(serr);
                        else if(project)
                            res.status(404).send('Error');
                        else {
                            
                            //String to Date
                            req.body.begin_date = parseDate(req.body.begin_date, true); 
                            req.body.end_date = parseDate(req.body.end_date, false);
                            var new_project = new Project(req.body);
                            //check if is possible to create the project
                            if(!(portfolio.total_value - new_project.total_value >= 0))
                                res.status(404).send('Error');

                            new_project.validateProjectRoles(Portfolio, async, function(result){
                                if(!result)
                                    res.status(404).send('Error');
                                else
                                {
                                    //create the project group
                                    var admin_key = req.user.decryptText(req.user.keycred);
                                    var admin_passkey = req.user.decryptText(req.user.keypasscred);
                                    AWS.config.update({accessKeyId: admin_key, secretAccessKey: admin_passkey});
                                    var iam = new AWS.IAM();
                                    var params = {
                                        GroupName: new_project.name /* required */
                                    };
                                    iam.createGroup(params, function(err, data) {
                                        if (err) 
                                            console.log(err, err.stack); // an error occurred
                                        else {

                                            //last but not least create the bucket folder
                                            var s3 = new AWS.S3();

                                            var params = { Bucket: Constants.BUCKET, Key: new_project.name + '/' };

                                            s3.putObject(params, function (err, data) {
                                                if (err) {
                                                    console.log("Error creating the folder: ", err);
                                                } else {
                                                    console.log("Successfully created a folder on S3");

                                                    //attach policy to group allowing read-write only to the project's folder in s3
                                                    var policy = s3GroupPolicy(Constants.BUCKET, new_project.name);
                                                    var params = {
                                                        GroupName: new_project.name, /* required */
                                                        PolicyDocument: JSON.stringify(policy),
                                                        PolicyName: 'S3'+new_project.name /* required */
                                                    };
                                                    iam.putGroupPolicy(params, function(err, data) {
                                                        if (err) 
                                                            console.log(err, err.stack); // an error occurred
                                                        else {
                                                            //if there's any users already related to this project, e.g. human_resources
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
                                                                        new_project.save(function(nperr, project) {
                                                                            if (nperr)
                                                                                throw nperr;
                                                                                
                                                                            portfolio.projects.push(project);
                                                                            portfolio.total_value = portfolio.total_value - project.total_value;

                                                                            portfolio.save(function(porterr){
                                                                                if(porterr)
                                                                                    res.send(serr); 
                                                                                else
                                                                                {
                                                                                    res.status(200).send(project);
                                                                                }
                                                                            });
                                                                        });
                                                                    }
                                                                });
                                                            }
                                                            else
                                                            {
                                                                new_project.save(function(nperr, project) {
                                                                    if (nperr)
                                                                        throw nperr;

                                                                    portfolio.projects.push(project);
                                                                    portfolio.total_value = portfolio.total_value - project.total_value;

                                                                    portfolio.save(function(porterr){
                                                                        if(porterr)
                                                                            res.send(serr); 
                                                                        else
                                                                        {
                                                                            res.status(200).send(project);
                                                                        }
                                                                    });
                                                                });
                                                            }
                                                        }
                                                    });
                                                }
                                            });
                                        }  
                                    });
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