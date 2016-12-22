import passport from 'passport';
// import cookie from 'cookie';
// import languageParser from 'accept-language-parser';
// import Promise from 'bluebird';
import app from '../../server';

import { User } from '../../models';

// Contains GET and post
// POST to create the request + Hash
// GET to check the hash

export function requestReset(req, res) {
	console.log('requestReset hit')
	const authenticatedUserAttributes = ['email'];
	const resetPasswordData = {};
	const success = false;

	User.findOne({
		where:{ email: req.body.email }
	}).then(function(user) {

		if (!user) {
			return res.status(200).json('User Not Found');
		}
		let resetHash = '';
		const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

		for (let index = 0; index < 12; index++) {
			resetHash += possible.charAt(Math.floor(Math.random() * possible.length));
		}

		const expiration = Date.now() + 1000 * 60 * 60 * 24; // Expires in 24 hours.

		// TO-DO: Make sure this is the right query
		User.update({ email: req.body.email }, { resetHash: resetHash, resetHashExpiration: expiration }, function(errUserUpdate, result) {if (errUserUpdate) return console.log(errUserUpdate);});

		// Send reset email
		sendResetEmail(user.email, resetHash, user.username, function(errSendRest, success) {
			if (errSendRest) { console.log(errSendRest); return res.status(500).json(errSendRest); }
			return res.status(200).json(success);
		});
	});

	return res.status(200).json({});

}
app.post('/user/password/reset', requestReset);

export function checkResetHash(req, res) {
	console.log('checkResetHash hit')

	User.findOne({resetHash: req.body.resetHash, username: req.body.username}).exec(function(err, user) {
		const currentTime = Date.now();
		if (!user || user.resetHashExpiration < currentTime) {
			return res.status(200).json('invalid');
		}

		return res.status(200).json('valid');
	});
}
app.get('/user/password/reset', checkResetHash);
