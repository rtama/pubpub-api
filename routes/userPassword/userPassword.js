import passport from 'passport';
// import cookie from 'cookie';
// import languageParser from 'accept-language-parser';
// import Promise from 'bluebird';
import app from '../../server';

import { User } from '../../models';


// If a User is authenticated then change their password
export function setPassword(req, res) {
	const hash = req.body.resetHash;
	const username = req.body.username;
	User.findOne({
		where: { resetHash: hash, username: username },
	}).then(function(user) {
		const currentTime = Date.now();

		if (!user) { throw new Error('User doesn\'t exist'); }

		if (user.resetHashExpiration < currentTime) { throw new Error('Hash is expired'); }

		// Update user
		user.setPassword(req.body.password, function() {
			user.resetHash = '';
			user.resetHashExpiration = currentTime;
			user.save();
			return res.status(200).json('success');
		});
	}).catch(function(err) {
		return res.status(401).json(err.message);
	});
}
app.post('/user/password', setPassword);
