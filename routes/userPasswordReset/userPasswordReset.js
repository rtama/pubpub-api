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
		where: { email: req.body.email }
	}).then(function(user) {
		if (!user) { throw new Error("User doesn't exist"); }


		const resetHash = generateHash();
		const expiration = Date.now() + 1000 * 60 * 60 * 24; // Expires in 24 hours.

		user.resetHash = resetHash;
		user.resetHashExpiration = expiration;

		console.log(`New reset hash:\n\t${resetHash}\n`);

		return user.save();
	}).then(function(user) {
		// Send reset email
		return sendResetEmail({ email: user.email, hash: user.resetHash, username: user.username });
	})
	.then(function() {
		return res.status(200).json({});
	})
	.catch(function(err) {
		return res.status(401).json(err.message);
	});
}
app.post('/user/password/reset', requestReset);

export function resetHashCheck(req, res) {
	const hash = req.query.hash;
	const username = req.query.username;

	User.findOne({
		where: { username: username },
	}).then(function(user) {
		const currentTime = Date.now();

		if (!user) { throw new Error('User doesn\'t exist'); }

		if (user.resetHash !== hash) { throw new Error('Hash is invalid ' + hash + ', ' + user.resetHash); }

		if (user.resetHashExpiration < currentTime) { throw new Error('Hash is expired'); }

		return res.status(200).json({ valid: true });
	}).catch(function(err) {
		return res.status(401).json(err.message);
	});

}

app.get('/user/password/reset', resetHashCheck);
