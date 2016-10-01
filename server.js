var app = require('express')(); //express middleware
var server = require('http').createServer(app); //server
var port = process.env.PORT || 8080; //port 8080 nginx is encrypting all data that comes on port 443 with https and redirecting here

var mongoose = require('mongoose'); //db middleware //mpromise is deprecated insted we are working with bluebird as a third party module
//but since we do not use promises (at least for now) theres no issue here just downloaded so the deprecated message would go away
var passport = require('passport'); //authorization middleware

var morgan       = require('morgan'); //log middleware
var cookieParser = require('cookie-parser'); //cookie middleware
var bodyParser   = require('body-parser'); //request body parser middleware
var session      = require('express-session'); //session express middleware
var MongoStore = require('connect-mongo')(session); //store cookie from session in db middleware

var logger = require('./config/logger'); //config logger morgan with winston
var configDB = require('./config/database'); //config db variables

const SECRET = 'portfoliomanagementpass'; //session secret

// configuration ===============================================================
 var promise_op = { promiseLibrary: require('bluebird') }; //third party promise library bluebird
mongoose.connect(configDB.url, promise_op); // connect to our database

require('./config/passport')(passport); // pass passport for configuration

// set up our express application
app.use(morgan('short', { 'stream' : logger.stream })); // log every request to the log file
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser.json()); // read json
app.use(bodyParser.urlencoded({ extended: true })); //read x-www-url
// required for passport
// uncomment for proxy connection
//app.enable('trust proxy');
app.use(session({ secret: SECRET,
                  resave : false, 
                  rolling : true,
                  saveUninitialized : false,
                  //proxy: true, //proxy connection
                  cookie : { secure : false, maxAge: 1800000, path : '/login', httpOnly : true },
                  store : new MongoStore({
                      mongooseConnection: mongoose.connection
                  })
                  })); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions

require('./app/routes.js')(app, passport);

server.listen(port);

/*var options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};*/

/*var a = https.createServer(options, function (req, res) {
  res.writeHead(200);
  res.end("hello world\n");
}).listen(8080);*/
//var a = http.createServer(function (req, res) {
//  res.writeHead(200);
//  res.end("hello world\n");
//}).listen(8080);