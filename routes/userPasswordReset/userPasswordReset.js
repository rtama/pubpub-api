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
	// const authenticatedUserAttributes = ['email'];
	// const resetPasswordData = {};
	// const success = false;

	User.findOne({
		where:{ email: req.body.email }
	}).then(function(user) {
		if (!user ){ throw new Error("User doesn't exist"); }


		let resetHash = '';
		const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

		for (let index = 0; index < 12; index++) {
			resetHash += possible.charAt(Math.floor(Math.random() * possible.length));
		}

		const expiration = Date.now() + 1000 * 60 * 60 * 24; // Expires in 24 hours.

		user.resetHash = resetHash;
		user.resetHashExpiration = expiration;

		console.log(`New reset hash:\n\t${resetHash}`);

		return user.save();
	}).then(function(user) {
		// Send reset email
		// sendResetEmail(user.email, user.resetHash, user.username, function(errSendRest, success) {
		// 	if (errSendRest) {
		// 		console.log(errSendRest);
		// 		return res.status(500).json(errSendRest);
		// 	}
		// 	return res.status(200).json(success);
		// });
		return res.status(200).json({});
	})
	.catch(function(err){
		console.log("Erorr " +err)
		return res.status(500).json(err.message);
	});


}
app.post('/user/password/reset', requestReset);

export function checkResetHash(req, res) {
	console.log('checkResetHash hit')


		User.findOne({
			where:{ email: req.body.email, resetHash: req.body.resetHash }
		}).then(function(user){

		const currentTime = Date.now();
		if (!user || user.resetHashExpiration < currentTime) {
			return res.status(200).json('invalid');
		}
		return res.status(200).json('valid');
	});
}
app.get('/user/password/reset', checkResetHash);
