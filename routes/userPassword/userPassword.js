import Promise from 'bluebird';
import app from '../../server';
import { User } from '../../models';

// If a User is authenticated with reset hash then change their password
export function postPassword(req, res) {
	const hash = req.body.resetHash;
	const username = req.body.username;
	const currentTime = Date.now();
	User.findOne({
		where: { resetHash: hash, username: username },
	})
	.then(function(user) {
		if (!user) { throw new Error('User doesn\'t exist'); }
		if (user.resetHashExpiration < currentTime) { throw new Error('Hash is expired'); }

		// Promisify the setPassword function, and use .update to match API convention
		const setPassword = Promise.promisify(user.setPassword, { context: User });
		return setPassword(req.body.password);
	})
	.then(function(passwordResetData) {
		const updateData = {
			resetHash: '',
			resetHashExpiration: currentTime,
		};
		return User.update(updateData, {
			where: { username: username },
		});
	})
	.then(function(updatedCount) {
		return res.status(200).json('success');
	})
	.catch(function(err) {
		return res.status(401).json(err.message);
	});
}
app.post('/user/password', postPassword);
