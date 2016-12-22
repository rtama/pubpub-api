import passport from 'passport';
// import cookie from 'cookie';
// import languageParser from 'accept-language-parser';
// import Promise from 'bluebird';
import app from '../../server';

import { User } from '../../models';


// If a User is authenticated then change their password
export function passwordReset(req, res) {
	console.log('passwordReset hit');

	User.findOne({
		where: { resetHash: req.body.resetHash, username: req.body.username },
		attributes: authenticatedUserAttributes
	}).then(function(user) {
		const currentTime = Date.now();
		if (!user || user.resetHashExpiration < currentTime) {
			return res.status(200).json('invalid');
		}

		console.log('User set password - not certain this is implemented but should be bc passport');
		// Update user
		user.setPassword(req.body.password, function() {
			user.resetHash = '';
			user.resetHashExpiration = currentTime;
			user.save();
			return res.status(200).json('success');
		});
	}).catch(function(error) {
		console.log('Got an error');
	});
}
app.post('/user/password', passwordReset);
