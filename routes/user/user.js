import Promise from 'bluebird';
// import passport from 'passport';
import app from '../../server';
import { SignUp, User } from '../../models';
import { generateHash } from '../../utilities/generateHash';

const authenticatedUserAttributes = ['username', 'firstName', 'lastName', 'image', 'bio', 'github', 'orcid', 'twitter', 'website', 'googleScholar', 'email'];
const unauthenticatedUserAttributes = ['username', 'firstName', 'lastName', 'image', 'bio', 'github', 'orcid', 'twitter', 'website', 'googleScholar'];

export function getUser(req, res, next) {
	// Check if authenticated
	// Build attribute models for authenticated or not
	// Get and return
	const requestedUser = req.query.username;
	const authenticated = req.user && req.user.username === requestedUser;
	const attributes = authenticated
		? authenticatedUserAttributes
		: unauthenticatedUserAttributes;
	
	User.findOne({ 
		where: { username: requestedUser, inactive: { $not: true } },
		attributes: attributes
	})
	.then(function(userData) {
		if (!userData) { return res.status(500).json('User not found'); }
		return res.status(201).json(userData);
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

	SignUp.findOne({ 
		where: { hash: req.body.hash, email: req.body.email },
		attributes: ['email', 'hash', 'completed'] 
	})
	.then(function(signUpData) {
		if (!signUpData) { throw new Error('Hash not valid'); }
		if (signUpData.completed) { throw new Error('Account already created'); }
		return true;
	})
	.then(function() {
		const newUser = {
			username: req.body.username,
			firstName: req.body.firstName,
			lastName: req.body.lastName,
			image: req.body.image,
			email: req.body.email,
			accessToken: generateHash(),
		};

		const userRegister = Promise.promisify(User.register, { context: User });
		return userRegister(newUser, req.body.password);
	})
	.then(function(newUser) {
		return SignUp.update({ completed: true }, {
			where: { email: req.body.email, completed: false },
		});
	})
	.then(function(updatedSignUp) {
		return User.findOne({ 
			where: { username: req.body.username },
			attributes: authenticatedUserAttributes
		});
	})
	.then(function(newUser) {
		return res.status(201).json(newUser);
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

	const requestedUser = req.body.username;
	const authenticated = req.user && req.user.username === requestedUser;
	if (!authenticated) { return res.status(500).json('Unauthorized'); }

	const updatedUser = { ...req.body }; // Remove the items you don't want to let me updated
	delete updatedUser.id;
	delete updatedUser.hash;
	delete updatedUser.salt;
	delete updatedUser.createdAt;
	delete updatedUser.updatedAt;
	delete updatedUser.isUnclaimed;

	User.update(updatedUser, {
		where: { username: requestedUser }
	})
	.then(function(updatedCount) {
		return User.findOne({ 
			where: { username: req.body.username },
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

	const requestedUser = req.body.username;
	const authenticated = req.user && req.user.username === requestedUser;
	if (!authenticated) { return res.status(500).json('Unauthorized'); }

	User.update({ inactive: true }, {
		where: { username: requestedUser, inactive: { $not: true } }
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
