import passport from 'passport';
// import cookie from 'cookie';
// import languageParser from 'accept-language-parser';
// import Promise from 'bluebird';
import app from '../../server';

import { User } from '../../models';
import { generateHash } from '../../utilities/generateHash';
import { sendResetEmail } from '../../utilities/sendResetEmail';

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


		const resetHash = generateHash();
		const expiration = Date.now() + 1000 * 60 * 60 * 24; // Expires in 24 hours.

		user.resetHash = resetHash;
		user.resetHashExpiration = expiration;

		console.log(`New reset hash:\n\t${resetHash}\n`);

		return user.save();
	}).then(function(user) {
		// Send reset email
		console.log("sending reset email")
		sendResetEmail(user.email, user.resetHash, user.username, function(errSendRest, success) {
			console.log("Send reset email " + errSendRest + "..." + success)
			if (errSendRest) {
				console.log(errSendRest);
				return res.status(500).json(errSendRest);
			}
			return res.status(200).json(success);
		});
		return res.status(200).json({});
	})
	.catch(function(err) {
		console.log("Ahh an error " +err)
		return res.status(401).json(err.message);
	});
}
app.post('/user/password/reset', requestReset);
