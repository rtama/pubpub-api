import osprey from 'osprey';
import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import path from 'path';

import { sequelize, User } from './models';

/* -------------------------------- */
/* Initialize development variables */
/* -------------------------------- */
if (process.env.NODE_ENV !== 'production') {
	require('./config.js');
	console.debug = function() {};
}
// console.debug = console.info;
console.debug = function() {};
/* -------------------------------- */
/* -------------------------------- */

const app = express();
export default app;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

/* -------- */
/* Configure app session */
/* -------- */
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
app.use(session({
	secret: 'superdupersecret',
	resave: true,
	saveUninitialized: true,
	store: new SequelizeStore({
		db: sequelize
	}),
	cookie: {
		path: '/',
		// domain: '127.0.0.1', // This was causing all sorts of mayhem. 
		httpOnly: false,
		secure: false,
		maxAge: 30 * 24 * 60 * 60 * 1000// = 30 days.
	},
}));

/* ------------------- */
/* Configure app login */
/* ------------------- */
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
passport.use(new LocalStrategy(
	function(username, password, done) {
		User.findOne({ where: { username: username } })
		.then(function(user) {
			if (!user) { return done(null, false, { message: 'Incorrect username.' }); }
			if (!user.validPassword(password)) { return done(null, false, { message: 'Incorrect password.' }); }
			return done(null, user);
		})
		.catch(function(err) {
			console.log('Passport err', err);
			return done(err);
		});
	}
));

app.use(passport.initialize());
app.use(passport.session());

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser()); // use static serialize and deserialize of model for passport session support
passport.deserializeUser(User.deserializeUser()); // use static serialize and deserialize of model for passport session support
/* -------------------- */
/* -------------------- */

require('./routes/uploadPolicy');

// Catch the browser's favicon request. You can still
// specify one as long as it doesn't have this exact name and path.
app.get('/favicon.ico', function(req, res) {
	res.writeHead(200, { 'Content-Type': 'image/x-icon' });
	res.end();
});

/* ------------------- */
/* Start osprey server */
/* ------------------- */
osprey.loadFile(path.join(__dirname, 'api.raml')).then(function (middleware) {

	app.use(middleware);

	app.all('/*', function(req, res, next) {
		res.header('Access-Control-Allow-Origin', req.headers.origin);
		res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
		res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
		res.header('Access-Control-Allow-Credentials', true);
		next();
	});

	app.use(function (err, req, res, next) {
		// Handle errors.
		console.log('Error! ' + err + ', ' + next);
		next();
	});

	/* ------------------- */
	/* API Endpoints */
	/* ------------------- */
	require('./routes/signUp/signUp.js');
	require('./routes/user/user.js');
	require('./routes/login/login.js');
	require('./routes/logout/logout.js');
	require('./routes/pub/pub.js');
	require('./routes/pubContributors/pubContributors.js');
	require('./routes/pubDiscussions/pubDiscussions.js');
	require('./routes/pubVersions/pubVersions.js');
	require('./routes/pubLabels/pubLabels.js');
	require('./routes/pubReactions/pubReactions.js');
	require('./routes/pubReviewers/pubReviewers.js');
	require('./routes/pubSubmits/pubSubmits.js');
	require('./routes/pubFeatures/pubFeatures.js');
	require('./routes/journal/journal.js');
	
	/* ------------------- */
	/* ------------------- */

	const port = process.env.PORT || 9876;
	app.listen(port, (err) => {
		if (err) { console.error(err); }
		console.info('----\n==> 🌎  API is running on port %s', port);
		console.info('==> 💻  Send requests to http://localhost:%s', port);
	});
})
.catch(function(err) { console.error('Error: %s', err.message); });
