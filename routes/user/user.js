import Promise from 'bluebird';
import passport from 'passport';
import app from '../../server';
import { redisClient, SignUp, User, Pub, Journal, Label, Contributor, InvitedReviewer } from '../../models';
import { generateHash } from '../../utilities/generateHash';

export const userAttributes = ['id', 'username', 'firstName', 'lastName', 'avatar', 'bio'];
export const authenticatedUserAttributes = ['id', 'username', 'firstName', 'lastName', 'avatar', 'bio', 'publicEmail', 'github', 'orcid', 'twitter', 'website', 'googleScholar', 'email', 'accessToken'];
export const unauthenticatedUserAttributes = ['id', 'username', 'firstName', 'lastName', 'avatar', 'bio', 'publicEmail', 'github', 'orcid', 'twitter', 'website', 'googleScholar'];

export function queryForUser(value) {
	const where = isNaN(value) 
		? { username: value, inactive: { $not: true } }
		: { id: value, inactive: { $not: true } };

	return User.findOne({ 
		where: where,
		attributes: authenticatedUserAttributes,
		include: [
			// { model: Pub, as: 'pubs', include: [{ model: Pub, as: 'replyRootPub' }] },
			{ model: Contributor, separate: true, as: 'contributions', include: [{ model: Pub, as: 'pub', include: [{ model: Pub, as: 'replyRootPub' }] }] },
			{ model: Journal, as: 'journals' },
			{ model: User, as: 'followers', attributes: unauthenticatedUserAttributes }, 
			{ model: Pub, as: 'followsPubs' }, 
			{ model: User, as: 'followsUsers' }, 
			{ model: Journal, as: 'followsJournals' }, 
			{ model: Label, as: 'followsLabels' }, 
		]
	});
}
export function getUser(req, res, next) {
	const username = req.query.username ? req.query.username.toLowerCase() : '';
	const authenticated = req.user && req.user.username === username;
	
	console.time('userQueryTime');
	redisClient.getAsync('u_' + username).then(function(redisResult) {
		if (redisResult) { return redisResult; }
		return queryForUser(username);
	})
	.then(function(userData) {
		if (!userData) { throw new Error('User not Found'); }
		const outputData = userData.toJSON ? userData.toJSON() : JSON.parse(userData);
		console.log('Using Cache: ', !userData.toJSON);
		const setCache = userData.toJSON ? redisClient.setexAsync('u_' + username, 120, JSON.stringify(outputData)) : {};
		return Promise.all([outputData, setCache]);
	})
	.spread(function(userData, setCacheResult) {
		const outputUserData = {
			...userData,
			email: authenticated ? userData.email : undefined,
			accessToken: authenticated ? userData.accessToken : undefined,
			contributions: userData.contributions.filter((contribution)=> {
				if (!contribution.pub.isPublished && !authenticated) { return false; }
				return true;
			}),
		};
		console.timeEnd('userQueryTime');
		
		return res.status(201).json(outputUserData);
	})
	.catch(function(err) {
		console.error('Error in getUser: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/user', getUser);

export function postUser(req, res, next) {
	// Check that hash and email sync up
	// Create user
	// Update SignUp to 'completed'
	// Get authenticated user data
	// Return
	const email = req.body.email ? req.body.email.toLowerCase() : '';
	const username = req.body.username ? req.body.username.toLowerCase() : '';

	let newUserId;

	SignUp.findOne({ 
		where: { hash: req.body.hash, email: email },
		attributes: ['email', 'hash', 'completed'] 
	})
	.then(function(signUpData) {
		if (!signUpData) { throw new Error('Hash not valid'); }
		if (signUpData.completed) { throw new Error('Account already created'); }
		return true;
	})
	.then(function() {
		const newUser = {
			email: email.trim(),
			username: username.trim(),
			firstName: req.body.firstName.trim(),
			lastName: req.body.lastName.trim(),
			password: req.body.password,
			avatar: req.body.avatar,
			bio: req.body.bio.trim(),
			publicEmail: req.body.publicEmail,
			website: req.body.website.trim(),
			twitter: req.body.twitter.trim(),
			orcid: req.body.orcid.trim(),
			github: req.body.github.trim(),
			googleScholar: req.body.googleScholar.trim(),
			accessToken: generateHash(),
		};

		const userRegister = Promise.promisify(User.register, { context: User });
		return userRegister(newUser, req.body.password);
	})
	.then(function(newUser) {
		newUserId = newUser.id;
		console.log('new user id is ', newUserId);
		return SignUp.update({ completed: true }, {
			where: { email: email, completed: false },
			individualHooks: true
		});
	})
	.then(function(updatedSignUp) {
		// Find all the invited reviewers with this email, and switch them to use userId
		return InvitedReviewer.update({ email: null, name: null, invitedUserId: newUserId }, {
			where: { email: email },
			individualHooks: true
		});
	})
	.then(function(updatedInvitedReviewers) {
		return User.findOne({ 
			where: { username: username },
			attributes: authenticatedUserAttributes
		});
	})
	.then(function(newUser) {
		passport.authenticate('local')(req, res, function() {
			return res.status(201).json(newUser);
		});
	})
	.catch(function(err) {
		console.error('Error in postUser: ', err);
		const errorSimple = err.message || '';
		const errorsArray = err.errors || [];
		const errorSpecific = errorsArray[0] || {};

		if (errorSimple.indexOf('User already exists') > -1) { return res.status(500).json('Username already used'); }
		if (errorSpecific.message === 'username must be unique') { return res.status(500).json('Username already used'); }
		if (errorSpecific.message === 'email must be unique') { return res.status(500).json('Email already used'); }
		if (errorSpecific.message === 'Validation isEmail failed') { return res.status(500).json('Not a valid email'); }
		if (errorSpecific.message === 'Validation isAlphanumeric failed') { return res.status(500).json('Username can only contain letters and numbers'); }
		if (errorSpecific.message === 'Validation is failed') { return res.status(500).json('Username must have at least one letter'); }

		return res.status(500).json(err.message);
	});
}
app.post('/user', postUser);

export function putUser(req, res, next) {
	// Check if authenticated. Update. Find and return.

	const userId = req.body.userId;
	const authenticated = req.user && req.user.id === userId;
	if (!authenticated) { return res.status(500).json('Unauthorized'); }

	const updatedUser = {};
	Object.keys(req.body).map((key)=> {
		if (['username', 'firstName', 'lastName', 'avatar', 'email', 'bio', 'publicEmail', 'github', 'orcid', 'twitter', 'website', 'googleScholar'].indexOf(key) > -1) {
			updatedUser[key] = req.body[key] && req.body[key].trim ? req.body[key].trim() : req.body[key];
		} 
	});

	User.update(updatedUser, {
		where: { id: userId },
		individualHooks: true
	})
	.then(function(updatedCount) {
		return User.findOne({ 
			where: { id: userId },
			attributes: authenticatedUserAttributes
		});
	})
	.then(function(userData) {
		return res.status(201).json(userData);
	})
	.catch(function(err) {
		console.error('Error in putUser: ', err);
		return res.status(500).json(err.message);
	});
}
app.put('/user', putUser);

export function deleteUser(req, res, next) {
	// Check if authenticated. Make Inactive. Find and return.
	// At the moment, we don't delete for archival purposes. Need to maintain user's name associated with published work.

	const username = req.body.username ? req.body.username.toLowerCase() : '';
	const requestedUser = username;
	const authenticated = req.user && req.user.username === requestedUser;
	if (!authenticated) { return res.status(500).json('Unauthorized'); }

	User.update({ inactive: true }, {
		where: { username: requestedUser, inactive: { $not: true } },
		individualHooks: true
	})
	.then(function(updatedCount) {
		if (updatedCount[0] === 0) { return res.status(500).json('Account already inactive'); }
		return res.status(201).json('User account set inactive');
	})
	.catch(function(err) {
		console.error('Error in deleteUser: ', err);
		return res.status(500).json(err.message);
	});
}
app.delete('/user', deleteUser);

// export function getUserProfile(req, res, next) {
// 	// Check if authenticated
// 	// Build attribute models for authenticated or not
// 	// Get and return
// 	const username = req.query.username ? req.query.username.toLowerCase() : '';
// 	const requestedUser = username;
// 	const authenticated = req.user && req.user.username === requestedUser;
// 	const attributes = authenticated
// 		? authenticatedUserAttributes
// 		: unauthenticatedUserAttributes;
	
// 	User.findOne({ 
// 		where: { username: requestedUser, inactive: { $not: true } },
// 		attributes: attributes,
// 		include: [{ model: Pub, as: 'pubs' }]
// 		// only populate public follows if necessary
// 	})
// 	.then(function(userData) {
// 		if (!userData) { return res.status(500).json('User not found'); }
// 		return res.status(201).json(userData);
// 	})
// 	.catch(function(err) {
// 		console.error('Error in getUser: ', err);
// 		return res.status(500).json(err.message);
// 	});
// }
// app.get('/user/profile', getUserProfile);
