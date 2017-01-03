/* eslint-disable no-param-reassign */
import app from '../../server';

import { User } from '../../models';
import { generateHash } from '../../utilities/generateHash';
import { sendResetEmail } from '../../utilities/sendResetEmail';

export function postReset(req, res) {
	User.findOne({
		where: { email: req.body.email }
	}).then(function(user) {
		if (!user) { throw new Error("User doesn't exist"); }

		const resetHash = generateHash();
		const expiration = Date.now() + (1000 * 60 * 60 * 24); // Expires in 24 hours.

		// Use User.update rather than .save() to match convention with the rest of the API
		const updateData = {
			resetHash: resetHash,
			resetHashExpiration: expiration,
		};
		return User.update(updateData, {
			where: { id: user.id },
			returning: true,
		});

	}).then(function(updatedUserData) {
		const updatedUser = updatedUserData[1][0];

		return sendResetEmail({ email: updatedUser.email, hash: updatedUser.resetHash, username: updatedUser.username });
	})
	.then(function() {
		// Always return something. Never an empty object. Makes debugging pretty hard.
		return res.status(200).json(true);
	})
	.catch(function(err) {
		return res.status(401).json(err.message);
	});
}

export function getReset(req, res) {
	// This route should be called when the frontend route with /:has loads
	// We want to check that the hash is valid before the user submits the new password.
	// They should not see a reset form if the hash is invalid.
	// See getSignUp in /signUp/signUp.js

	const hash = req.query.hash;
	const username = req.query.username;


	User.findOne({
		where: { username: username },
	}).then(function(user) {
		const currentTime = Date.now();

		if (!user) { throw new Error('User doesn\'t exist'); }

		if (user.resetHash !== hash) { throw new Error('Hash is invalid ' + hash + ', ' + user.resetHash); }

		if (user.resetHashExpiration < currentTime) { throw new Error('Hash is expired'); }

		return res.status(200).json(true);
	}).catch(function(err) {
		return res.status(401).json(err.message);
	});

}

app.get('/user/password/reset', getReset);

app.post('/user/password/reset', postReset);
