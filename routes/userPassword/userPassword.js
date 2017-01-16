import Promise from 'bluebird';
import app from '../../server';
import { User } from '../../models';

export function postPassword(req, res) {
	const user = req.user || {};
	const resetHash = req.body.resetHash;
	const username = req.body.username;
	const currentTime = Date.now();

	const whereQuery = user.id
		? { id: user.id }
		: { resetHash: resetHash, username: username };

	User.findOne({
		where: whereQuery,
	})
	.then(function(userData) {
		if (!userData) { throw new Error('User doesn\'t exist'); }
		if (!user.id && resetHash && userData.resetHashExpiration < currentTime) { throw new Error('Hash is expired'); }

		// Promisify the setPassword function, and use .update to match API convention
		const setPassword = Promise.promisify(userData.setPassword, { context: userData });
		return setPassword(req.body.password);

	})
	.then(function(passwordResetData) {
		const updateData = {
			hash: passwordResetData.dataValues.hash,
			salt: passwordResetData.dataValues.salt,
			resetHash: '',
			resetHashExpiration: currentTime,
		};
		return User.update(updateData, {
			where: whereQuery,
			individualHooks: true
		});
	})
	.then(function(updatedCount) {
		return res.status(200).json(true);
	})
	.catch(function(err) {
		return res.status(401).json(err.message);
	});
}
app.post('/user/password', postPassword);
