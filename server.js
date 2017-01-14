/* eslint-disable no-param-reassign */

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
// const LocalStrategy = require('passport-local').Strategy;
// passport.use(new LocalStrategy({
// 		usernameField: 'email',
// 		hashField: 'hash',
// 		saltField: 'salt'
// 	},
// 	function(email, password, done) {
// 		console.log('yo yo ', email)
// 		User.findOne({ 
// 			where: { email: email },
// 			include: [
// 				{ model: Contributor, separate: true, as: 'contributions', include: [{ model: Pub, as: 'pub', where: { replyRootPubId: null }, }] },
// 				{ model: JournalAdmin, as: 'journalAdmins', include: [{ model: Journal, as: 'journal' }] },
// 			]
// 		})
// 		.then(function(user) {
// 			console.log('Im here in user 1');
// 			// console.log(user.contributions)
// 			if (!user) { return done(null, false, { message: 'Incorrect email.' }); }
// 			console.log('Im here in user 1b');
// 			if (!user.validPassword(password)) { return done(null, false, { message: 'Incorrect password.' }); }
// 			console.log('Im here in user 1c');
// 			return done(null, user);
// 		})
// 		.catch(function(err) {
// 			console.log('Passport err (Local Auth)', err);
// 			return done(err);
// 		});
// 	}
// ));

app.use(passport.initialize());
app.use(passport.session());
app.use(function(req, res, next) {
	if (req.user) { return next(); }

	const authorizationHeader = req.headers.authorization || '';
	const authorizationHeaderArray = authorizationHeader.split(' ');
	if (authorizationHeaderArray.length < 2) { return next(); }

	const authHeaders = new Buffer(authorizationHeaderArray[1], 'base64').toString();
	const username = authHeaders.split(':')[0];
	const password = authHeaders.split(':')[1];

	User.findOne({ where: { username: username } })
	.then(function(user) {
		if (!user || user.accessToken !== password) { return next(); }

		req.user = user;
		return next();
	})
	.catch(function(err) {
		console.log('Passport err (Basic Auth)', err);
		return next(err);
	});
});

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser()); // use static serialize and deserialize of model for passport session support
passport.deserializeUser(User.deserializeUser()); // use static serialize and deserialize of model for passport session support
/* -------------------- */
/* -------------------- */

if (process.env.WORKER !== 'true') {
	require('./routes/uploadPolicy');

	app.get('/testauth', function(req, res) {
		return res.status(201).json(req.user || 'No User');
	});

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
			// console.log('Error! ' + err + ', ' + next);
			console.log('Error! ' + err);
			next();
		});

		/* ------------------- */
		/* API Endpoints */
		/* ------------------- */
		require('./routes/search/search.js');
		require('./routes/licenses/licenses.js');
		require('./routes/signUp/signUp.js');
		require('./routes/user/user.js');
		require('./routes/userLabels/userLabels.js');
		require('./routes/labels/labels.js');
		require('./routes/login/login.js');
		require('./routes/logout/logout.js');
		require('./routes/pub/pub.js');
		require('./routes/pubContributors/pubContributors.js');
		require('./routes/pubContributorRoles/pubContributorRoles.js');
		require('./routes/pubDiscussions/pubDiscussions.js');
		require('./routes/pubVersions/pubVersions.js');
		require('./routes/pubLabels/pubLabels.js');
		require('./routes/pubReactions/pubReactions.js');
		require('./routes/pubReviewers/pubReviewers.js');
		require('./routes/pubSubmits/pubSubmits.js');
		require('./routes/pubFeatures/pubFeatures.js');
		require('./routes/pubFileRelations/pubFileRelations.js');
		require('./routes/pubFileAttributions/pubFileAttributions.js');
		require('./routes/activities/activities.js');
		require('./routes/journal/journal.js');
		require('./routes/journalAdmins/journalAdmins.js');
		require('./routes/journalFeatures/journalFeatures.js');
		require('./routes/journalSubmits/journalSubmits.js');
		require('./routes/journalLabels/journalLabels.js');
		require('./routes/followsPub/followsPub.js');
		require('./routes/followsJournal/followsJournal.js');
		require('./routes/followsUser/followsUser.js');
		require('./routes/followsLabel/followsLabel.js');
		require('./routes/userPassword/userPassword.js');
		require('./routes/userPasswordReset/userPasswordReset.js');



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
}
