import osprey from 'osprey';
import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import path from 'path';
import Promise from 'bluebird';

import { sequelize, User, Pub, Discussion, File, Version, VersionFiles, Contributors, Attributions, PubVersions, UserDiscussions } from './models';
import { generateHash } from './utilities/generateHash';

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

// Short-circuit the browser's annoying favicon request. You can still
// specify one as long as it doesn't have this exact name and path.
app.get('/favicon.ico', function(req, res) {
	res.writeHead(200, { 'Content-Type': 'image/x-icon' });
	res.end();
});


app.get('/generateData', function(req, res, next) {
	const newUser = {
		name: 'Travis Rich',
		email: 'testing' + String(Math.random()) + '@gmail.co',
	};
	const newUser2 = {
		name: 'Thariq Shihipar',
		email: 'testing2' + String(Math.random()) + '@gmail.co',
	};
	const newUser3 = {
		name: 'Andrew Lippman',
		email: 'testing3' + String(Math.random()) + '@gmail.co',
	};
	const createUser = User.register(newUser, 'password', function(err, account) {
		const output = {...account.dataValues};
		return output;
	});
	const createUser2 = User.register(newUser2, 'password', function(err, account) {
		const output = {...account.dataValues};
		return output;
	});
	const createUser3 = User.register(newUser3, 'password', function(err, account) {
		const output = {...account.dataValues};
		return output;
	});
	const createPub = Pub.create({
		title: 'Tools for Structured Collaborative Research',
		slug: 'sample',
		type: 'document',
	});

	const createVersion1 = Version.create({
		versionMessage: 'Version 1.',
		isPublic: true,
	});

	const createFile1 = File.create({
		type: 'text',
		name: 'main.md',
		url: null,
		value: '# Open, Structured Research \n We present a system for academic publication, called PubPub, that allows for data, code, and interactive elements to be directly integrated into the document. PubPub is optimized for collaboration and iterative document creation; taking inspiration from the software development cycle it allows for more participatory forms of review. We hypothesize that by changing the scientific review process from one of static critique to one of interactive collaboration we can increase the error-detection rate and broaden the contribution types of scientific review. This work is motivated by a growing recognition that in many fields, notably those that rely on data analysis and computing, the existing review process is not sufficiently fair, accurate, or timely. \n [ ![allosaurusGraph.jpg](allosaurusGraph.jpg)](http://localhost:8000/project/560c8d88a3474bc920a5d95d)',
	});
	const createFile2 = File.create({
		type: 'image',
		name: 'allosaurusGraph.jpg',
		url: 'https://s3.amazonaws.com/dubdub-datasets/9ecba1ea6a8a0d126579dc82d75bebea.png',
		value: null,
	});

	


	Promise.all([
		createUser,
		createUser2,
		createUser3,
		createPub,
		createFile1,
		createFile2,
		createVersion1,
	])
	.then(function(){
		const createDiscussion1 = Discussion.create({
			title: 'How to move Open Discussions forward',
			content: 'The challenge of open research is rewarding all parties.',
			pubId: 1,
		});

		const createDiscussion2 = Discussion.create({
			title: 'Integrating existing workflows',
			content: 'The tools used for research are broad and diverse. How do we effectively leverage their power while structuring the process.',
			pubId: 1,
		});

		const createFileLinks1 = VersionFiles.create({
			versionId: 1,
			fileId: 1
		});
		const createFileLinks2 = VersionFiles.create({
			versionId: 1,
			fileId: 2
		});

		const createVersionLinks = PubVersions.create({
			versionId: 1,
			pubId: 1,
		});

		return Promise.all([
			createFileLinks1,
			createFileLinks2,
			createDiscussion1,
			createDiscussion2,
			createVersionLinks,
		]);
	})
	.then(function() {
		return Promise.delay(500);
	})
	.then(function(){

		const createUserDiscussionLinks1 = UserDiscussions.create({
			userId: 1,
			discussionId: 1,
		});
		const createUserDiscussionLinks2 = UserDiscussions.create({
			userId: 1,
			discussionId: 2,
		});
		const createUserPubLink = Contributors.create({
			userId: 1,
			pubId: 1,
		});
		const createUserPubLink2 = Contributors.create({
			userId: 2,
			pubId: 1,
		});
		const createUserPubLink3 = Contributors.create({
			userId: 3,
			pubId: 1,
		});
		const createAttribution1 = Attributions.create({
			userId: 1,
			fileId: 1,
		});
		const createAttribution2 = Attributions.create({
			userId: 1,
			fileId: 2,
		});
		return Promise.all([
			createUserDiscussionLinks1,
			createUserDiscussionLinks2,
			createUserPubLink,
			createUserPubLink2,
			createUserPubLink3,
			createAttribution1,
			createAttribution2
		]);
	})
	.then(function(){
		return res.status(201).json('Done');
	})
	.catch(function(err){
		return res.status(500).json(err);
	});
});

app.get('/getData', function(req, res, next) {
	Pub.findOne({
		where: {slug: 'sample'},
		include: [
			{model: User, as: 'contributors', through: { attributes: [] }},
			{model: Discussion, as: 'discussions', include: [{model: User, as: 'users'}]},
			{model: Version, as: 'versions', include: [{model: File, as: 'files', include: [{model: User, as: 'users'}]}]},
		]
	})
	.then(function(pub) {
		return res.status(201).json(pub);
	})
	.catch(function(err) {
		console.log(err);
		return res.status(500).json(err);
	});
});

app.get('/getPub/:slug', function(req, res, next) {
	
	Pub.findOne({
		where: {slug: req.params.slug},
		include: [
			{model: User, as: 'contributors', through: { attributes: [] }},
			{model: Discussion, as: 'discussions', include: [{model: User, as: 'users'}]},
			{model: Version, as: 'versions', include: [{model: File, as: 'files', include: [{model: User, as: 'users'}]}]},
		]
	})
	.then(function(pub) {
		return res.status(201).json(pub);
	})
	.catch(function(err) {
		console.log(err);
		return res.status(500).json(err);
	});
});

// app.post('/user', function(req, res, next) {
// 	const newUser = {
// 		name: req.body.name,
// 		email: req.body.email
// 	};

// 	User.register(newUser, 'password', function(err, account) {
// 		if (err) { return res.status(500).json(err); }
// 		const output = {...account.dataValues};
// 		return res.status(201).json(output);
// 	});
// });

// app.post('/signup', function(req, res, next) {
// 	// First, try to update the emailSentCount.
// 	// If there are no records to update, then we create a new one.
// 	SignUp.update({count: sequelize.literal('count + 1')}, {
// 		where: {email: req.body.email},
// 		individualHooks: true, // necessary for afterUpdate hook to fire.
// 	})
// 	.then(function(updateCount) {
// 		if (updateCount[0]) { return updateCount[0]; }
// 		return SignUp.create({
// 			email: req.body.email,
// 			hash: 'blahblabhlab',
// 			count: 1,
// 			completed: false,
// 		});
// 	})
// 	.then(function(result) {
// 		return res.status(201).json(true)
// 	})
// 	.catch(function(err) {
// 		console.log(err);
// 		return res.status(500).json(err);
// 	});
// });
// Signup Update increment emailSentCount
// Signup Update complete
// Login
// Logout
// View user
// Update user
// Create pub



app.post('/discussion', function(req, res, next) {
	Discussion.create({
		title: req.body.title || '',
		content: req.body.content || '',
		pubId: req.body.pubId,
		parentId: req.body.parentId,
	})
	.then(function(discussion){
		// console.log(discussion);
		return UserDiscussions.create({
			userId: req.body.userId,
			discussionId: discussion.id,
		});
	})
	.then(function(userDiscussion) {
		return Discussion.findOne({
			where: {id: userDiscussion.discussionId},
			include: [
				{model: User, as: 'users'}
			]
		});
	})
	.then(function(discussion) {
		return res.status(201).json(discussion);
	})
	.catch(function(err) {
		console.log(err);
		return res.status(500).json(err);
	});
});

/* ------------------- */
/* Start osprey server */
/* ------------------- */
osprey.loadFile(path.join(__dirname, 'api.raml')).then(function (middleware) {

	app.use(middleware);

	app.all('/*', function(req, res, next) {
		res.header("Access-Control-Allow-Origin", req.headers.origin);
		res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
		res.header("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, OPTIONS");
		res.header("Access-Control-Allow-Credentials", true);
		next();
	});

	app.use(function (err, req, res, next) {
		// Handle errors.
		console.log("Error! " + err + ", " + next)
		next();
	});

	/* ------------------- */
	/* Begin API Endpoints */
	/* ------------------- */
	require('./routes/signUp/signUp.js');
	require('./routes/user/user.js');

	/* GET Login data by cookie*/
	app.get('/login', function(req, res, next) {
		const userID = req.user ? req.user.id : null;
		User.findOne({
			where: {id: userID},
			attributes: { exclude: ['salt', 'hash', 'createdAt', 'updatedAt'] },
			include: [ {model: Link, as: 'links'}, {model: User, as: 'followers', foreignKey: 'follower', attributes: { exclude: ['salt', 'hash', 'apiToken', 'email', 'createdAt', 'updatedAt'] } }, {model: User, as: 'following', foreignKey: 'followee', attributes: { exclude: ['salt', 'hash', 'apiToken', 'email', 'createdAt', 'updatedAt'] }, include: [{model: Link, as: 'links'}]} ]
		})
		.then(function(user) {
			if (!user) { return res.status(201).json({}); }
			const output = {...user.dataValues};
			res.status(201).json(output);
		})
		.catch(function(err) {
			console.log(err);
			res.status(500).json(err);
		});
	});

	/* POST Login data by username, password and authenticate*/
	app.post('/login', passport.authenticate('local'), function(req, res, next) {
		const userID = req.user ? req.user.id : null;
		User.findOne({
			where: {id: userID},
			attributes: { exclude: ['salt', 'hash', 'createdAt', 'updatedAt'] },
			include: [ {model: Link, as: 'links'}, {model: User, as: 'followers', foreignKey: 'follower', attributes: { exclude: ['salt', 'hash', 'apiToken', 'email', 'createdAt', 'updatedAt'] } }, {model: User, as: 'following', foreignKey: 'followee', attributes: { exclude: ['salt', 'hash', 'apiToken', 'email', 'createdAt', 'updatedAt'] }, include: [{model: Link, as: 'links'}]} ]
		})
		.then(function(user) {
			if (!user) { return res.status(201).json({}); }
			const output = {...user.dataValues};
			res.status(201).json(output);
		})
		.catch(function(err) {
			console.log(err);
			res.status(500).json(err);
		});
	});

	/* GET Logout a user */
	app.get('/logout', function(req, res) {
		req.logout();
		res.status(201).json(true);
	});

	/* GET search for users */
	app.get('/search/:string', function(req, res, next) {
		User.findAll({
			where: {	
				$or: [
					{ 'username': { ilike: '%' + req.params.string + '%' } },
					{ 'name': { ilike: '%' + req.params.string + '%' } },
				]
			},
			attributes: { exclude: ['salt', 'hash', 'apiToken', 'email', 'createdAt', 'updatedAt'] }
		})
		.then(function(users) {
			res.status(201).json(users);
		})
		.catch(function(err) {
			console.log(err);
			res.status(500).json(err);
		});
	});


	/* GET Recently active users */
	app.get('/recent', function(req, res, next) {
		Link.findAll({
			order: [ [ 'createdAt', 'DESC' ]],
			limit: 50,
		})
		.then(function(recentLinks) {
			const userIDs = recentLinks.map((link)=> {
				return link.UserId;
			});
			return User.findAll({
				where: {
					id: userIDs,
				},
				attributes: { exclude: ['salt', 'hash', 'apiToken', 'email', 'createdAt', 'updatedAt'] }
			});
		})
		.then(function(users) {
			res.status(201).json(users);
		})
		.catch(function(err) {
			console.log(err);
			res.status(500).json(err);
		});
	});
	

	/* POST a new user */
	app.post('/user', function(req, res, next) {
		
		const newUser = {
			username: req.body.username,
			name: req.body.name,
			image: req.body.image,
			email: req.body.email,
			apiToken: generateHash(),
		};
		User.register(newUser, req.body.password, function(err, account) {
			if (err) {
				const errorSimple = err.message || '';
				const errorsArray = err.errors || [];
				const errorSpecific = errorsArray[0] || {};

				if (errorSimple.indexOf('User already exists') > -1) { return res.status(500).json('Username already used'); }
				if (errorSpecific.message === 'email must be unique') { return res.status(500).json('Email already used'); }
				if (errorSpecific.message === 'Validation isEmail failed') { return res.status(500).json('Not a valid email'); }
				if (errorSpecific.message === 'Validation isAlphanumeric failed') { return res.status(500).json('Username can only contain letters and numbers'); }

				console.log('Error registering user');
				console.log(err);
				return res.status(500).json(JSON.stringify(err));
			}
			
			passport.authenticate('local')(req, res, function() {
				const output = {...account.dataValues};
				delete output.hash;
				delete output.salt;
				delete output.createdAt;
				delete output.updatedAt;

				return res.status(201).json(output);
			});
		});
	});

	

	/* PUT an update to one user */
	app.put('/user', function(req, res, next) {
		const userID = req.user ? req.user.id : undefined; // Get userData from cookie, or
		const apiToken = req.body.apiToken; // Get userData from apiToken
		if (!userID && !apiToken) {return res.status(400).json('Unauthorized')}

		const query = apiToken ? { apiToken: apiToken } : { id: userID };
		User.update(req.body, {
			where: query
		})
		.then(function(updatedCount) {
			if (!updatedCount[0]) { throw new Error('Invalid API Token or cookie'); }
			res.status(201).json({success: true});
		})
		.catch(function(err) {
			const errorSimple = err.message || '';
			const errorsArray = err.errors || [];
			const errorSpecific = errorsArray[0] || {};

			if (errorSimple.indexOf('Invalid API Token or cookie') > -1) { return res.status(500).json('Invalid API Token or cookie'); }
			if (errorSimple.indexOf('User already exists') > -1) { return res.status(500).json('Username already used'); }
			if (errorSpecific.message === 'username must be unique') { return res.status(500).json('Username already used'); }
			if (errorSpecific.message === 'email must be unique') { return res.status(500).json('Email already used'); }
			if (errorSpecific.message === 'Validation isEmail failed') { return res.status(500).json('Not a valid email'); }
			if (errorSpecific.message === 'Validation isAlphanumeric failed') { return res.status(500).json('Username can only contain letters and numbers'); }

			console.log('Error Updating user');
			console.log(err);
			return res.status(500).json(JSON.stringify(err));
		});
	});

	/* PUT an update to one user's token */
	app.put('/token', function(req, res, next) {
		const userID = req.user ? req.user.id : undefined; // Get userData from cookie, or
		const apiToken = req.body.apiToken; // Get userData from apiToken
		if (!userID && !apiToken) {return res.status(400).json('Unauthorized')}

		const newToken = generateHash();

		const query = apiToken ? { apiToken: apiToken } : { id: userID };
		User.update({apiToken: newToken}, {
			where: query
		})
		.then(function() {
			res.status(201).json({apiToken: newToken});
		})
		.catch(function(err) {
			return res.status(500).json(JSON.stringify(err));
		});
	});

	/* PUT an update to one user's password */
	app.put('/password', function(req, res, next) {
		const userID = req.user ? req.user.id : undefined; // Get userData from cookie, or
		const apiToken = req.body.apiToken; // Get userData from apiToken
		if (!userID && !apiToken) {return res.status(400).json('Unauthorized')}

		const query = apiToken ? { apiToken: apiToken } : { id: userID };
		User.findOne({
			where: query
		})
		.then(function(user) {
			user.authenticate(req.body.oldPassword, function(authErr, authResult) {
				if (authErr || !authResult) { return res.status(400).json('Old password incorrect'); }
				
				authResult.setPassword(req.body.newPassword, function(setErr, setResult) {
					if (setErr) { return res.status(400).json('Error saving new password'); }
					setResult.save()
					return res.status(201).json({sucess: true});	
				});
			})
		})
		.catch(function(err) {
			return res.status(500).json(JSON.stringify(err));
		});
	});

	/* Delete a user */
	app.delete('/user', function(req, res, next) {
		const userID = req.user ? req.user.id : undefined; // Get userData from cookie, or
		const apiToken = req.body.apiToken; // Get userData from apiToken
		if (!userID && !apiToken) {return res.status(400).json('Unauthorized')}

		const query = apiToken ? { apiToken: apiToken } : { id: userID };
		User.destroy({
			where: query
		})
		.then(function() {
			res.status(201).json({'success': true});
		})
		.catch(function(err) {
			console.log(err);
			res.status(500).json(err);
		});
	});


	/* GET one user by username or id*/
	app.get('/user/:id', function(req, res, next) {
		const query = isNaN(req.params.id) ? {username: req.params.id} : {id: req.params.id};
		User.findOne({
			where: query,
			attributes: { exclude: ['salt', 'hash', 'apiToken', 'email', 'createdAt', 'updatedAt'] },
			include: [ {model: Link, as: 'links'}, {model: User, as: 'followers', foreignKey: 'follower', attributes: { exclude: ['salt', 'hash', 'apiToken', 'email', 'createdAt', 'updatedAt'] } }, {model: User, as: 'following', foreignKey: 'followee', attributes: { exclude: ['salt', 'hash', 'apiToken', 'email', 'createdAt', 'updatedAt'] }, include: [{model: Link, as: 'links'}]} ]
		})
		.then(function(user) {
			res.status(201).json(user);
		})
		.catch(function(err) {
			console.log(err);
			res.status(500).json(err);
		});
	});


	/* POST a new Link */
	app.post('/link', function(req, res, next) {
		// const userID = req.user ? req.user.id : undefined;
		// const userIDKey = userID || req.body.UserId; // Use this once we have API tokens
		// const userIDKey = userID;

		const userID = req.user ? req.user.id : undefined; // Get userData from cookie, or
		const apiToken = req.body.apiToken; // Get userData from apiToken
		if (!userID && !apiToken) {return res.status(400).json('Unauthorized')}
		const query = apiToken ? { apiToken: apiToken } : { id: userID };

		User.findOne({
			where: query
		})
		.then(function(user) {
			if (!user) {return res.status(400).json('Unauthorized')}
			return Link.create({
				UserId: user.id,
				description: req.body.description,
				url: req.body.url,
			});
		})
		.then(function(link) {
			res.status(201).json(link);
		})
		.catch(function(err) {
			const errorSimple = err.message || '';
			const errorsArray = err.errors || [];
			const errorSpecific = errorsArray[0] || {};

			if (errorSpecific.message === 'Validation isUrl failed') { return res.status(500).json('Not a valid URL'); }

			console.log('Error Updating user');
			console.log(err);
			return res.status(500).json(JSON.stringify(err));
		});
	});

	/* PUT an update to one link */
	app.put('/link/:id', function(req, res, next) {
		const userID = req.user ? req.user.id : undefined; // Get userData from cookie, or
		const apiToken = req.body.apiToken; // Get userData from apiToken
		if (!userID && !apiToken) {return res.status(400).json('Unauthorized')}
		const query = apiToken ? { apiToken: apiToken } : { id: userID };

		Promise.all([
			User.findOne({ where: query }),
			Link.findOne({ where: {id: req.params.id} }),
		])			
		.then(function(allTasks) {
			const user = allTasks[0];
			const link = allTasks[1];
			if (link.UserId !== user.id) { throw new Error('Unauthorized'); }

			return Link.update(req.body, {
				where: {id: req.params.id}
			});
		})
		.then(function(updatedCount) {
			if (!updatedCount[0]) { throw new Error('Invalid API Token or cookie'); }
			res.status(201).json({'success': true});
		})
		.catch(function(err) {
			console.log(err);
			res.status(500).json(err);
		});
	});

	/* Delete a Link */
	app.delete('/link/:id', function(req, res, next) {
		const userID = req.user ? req.user.id : undefined; // Get userData from cookie, or
		const apiToken = req.body.apiToken; // Get userData from apiToken
		if (!userID && !apiToken) {return res.status(400).json('Unauthorized')}
		const query = apiToken ? { apiToken: apiToken } : { id: userID };

		Promise.all([
			User.findOne({ where: query }),
			Link.findOne({ where: {id: req.params.id} }),
		])			
		.then(function(allTasks) {
			const user = allTasks[0];
			const link = allTasks[1];
			if (link.UserId !== user.id) { throw new Error('Unauthorized'); }

			return Link.destroy({
				where: {id: req.params.id}
			});
		})
		.then(function() {
			res.status(201).json({'success': true});
		})
		.catch(function(err) {
			console.log(err);
			res.status(500).json(err);
		});
	});

	/* POST a new Follow */
	app.post('/follow', function(req, res, next) {
		const userID = req.user ? req.user.id : undefined; // Get userData from cookie, or
		const apiToken = req.body.apiToken; // Get userData from apiToken
		if (!userID && !apiToken) {return res.status(400).json('Unauthorized')}
		const query = apiToken ? { apiToken: apiToken } : { id: userID };

		const follower = req.body.follower;
		const followee = req.body.followee;

		// Do not create a Follow is follower and followee are equal
		if (follower === followee) {
			return res.status(500).json('Follower cannot be followee');
		}

		User.findOne({
			where: query
		})
		.then(function(user) {
			if (!user || user.id !== follower) {return res.status(400).json('Unauthorized')}
			return Follow.findOne({where: {follower: follower, followee: followee}});
		})
		.then(function(existingFollow) {
			if (existingFollow) { throw new Error('Follow already exists'); }
			return Follow.create({
				follower: follower,
				followee: followee,
				lastRead: req.body.lastRead || null,
			});
		})
		.then(function(follow) {
			const findUser = User.findOne({
				where: {id: follow.followee},
				attributes: { exclude: ['salt', 'hash', 'apiToken', 'email', 'createdAt', 'updatedAt'] },
				include: [{model: Link, as: 'links'}],
			});
			return [follow, findUser];
		})
		.spread(function(follow, user) {
			const output = {
				...user.dataValues,
				Follow: follow
			}
			res.status(201).json(output);
		})
		.catch(function(err) {
			console.log(err);
			res.status(500).json(err);
		});
	});

	/* PUT an update to one Follow */
	app.put('/follow', function(req, res, next) {
		const userID = req.user ? req.user.id : undefined; // Get userData from cookie, or
		const apiToken = req.body.apiToken; // Get userData from apiToken
		if (!userID && !apiToken) {return res.status(400).json('Unauthorized')}
		const query = apiToken ? { apiToken: apiToken } : { id: userID };
		const follower = req.body.follower;
		const followee = req.body.followee;

		User.findOne({
			where: query
		})
		.then(function(user) {
			if (!user || user.id !== follower) {return res.status(400).json('Unauthorized')}
			return Follow.update(req.body, {
				where: {follower: follower, followee: followee}
			});
		})
		.then(function(updatedCount) {
			if (!updatedCount[0]) { throw new Error('Invalid API Token or cookie'); }
			res.status(201).json({'success': true});
		})
		.catch(function(err) {
			console.log(err);
			res.status(500).json(err);
		});
	});

	/* DELETE an update to one Follow */
	app.delete('/follow', function(req, res, next) {
		// const user = req.user || {};
		// const follower = user.id || req.body.follower; // Use this one once we have apiTokens authenticating
		// const follower = user.id;

		const userID = req.user ? req.user.id : undefined; // Get userData from cookie, or
		const apiToken = req.body.apiToken; // Get userData from apiToken
		if (!userID && !apiToken) {return res.status(400).json('Unauthorized')}
		const query = apiToken ? { apiToken: apiToken } : { id: userID };

		const follower = req.body.follower;
		const followee = req.body.followee;

		User.findOne({
			where: query
		})
		.then(function(user) {
			if (!user || user.id !== follower) {return res.status(400).json('Unauthorized')}
			return Follow.destroy({
				where: {follower: follower, followee: req.body.followee}
			});
		})
		.then(function() {
			res.status(201).json({'success': true});
		})
		.catch(function(err) {
			console.log(err);
			res.status(500).json(err);
		});
	});

	/* PUT an update to one Follow */
	// app.put('/follow/:id', function(req, res, next) {
	// 	Follow.update(req.body, {
	// 		where: {id: req.params.id}
	// 	})
	// 	.then(function() {
	// 		res.status(201).json({'success': true});
	// 	})
	// 	.catch(function(err) {
	// 		console.log(err);
	// 		res.status(500).json(err);
	// 	});
	// });

	/* Delete a Follow */
	// app.delete('/follow/:id', function(req, res, next) {
	// 	Follow.destroy({
	// 		where: {id: req.params.id}
	// 	})
	// 	.then(function() {
	// 		res.status(201).json({'success': true});
	// 	})
	// 	.catch(function(err) {
	// 		console.log(err);
	// 		res.status(500).json(err);
	// 	});
	// });

	const port = process.env.PORT || 9876;
	app.listen(port, (err) => {
		if (err) { console.error(err); }
		console.info('----\n==> 🌎  API is running on port %s', port);
		console.info('==> 💻  Send requests to http://localhost:%s', port);
	});
})
.catch(function(err) { console.error('Error: %s', err.message); });
