import app from '../../server';
import { FollowsJournal, User } from '../../models';
import { createActivity } from '../../utilities/createActivity';

const userAttributes = ['id', 'username', 'firstName', 'lastName', 'image', 'bio'];

export function getFollows(req, res, next) {
	// Return a list of users that are following
	FollowsJournal.findAll({
		where: { journalId: req.query.journalId },
		include: [
			{ model: User, as: 'user', attributes: userAttributes }, 
		]
	})
	.then(function(followsData) {
		// Filter through to see if contributor, set isAuthorized
		// Filter contributors
		if (!followsData) { return res.status(500).json('FollowsJournal data not found'); }
		const followers = followsData.map((followsItem)=> {
			return followsItem.user;
		});
		return res.status(201).json(followers);
	})
	.catch(function(err) {
		console.error('Error in getFileRelations: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/follows/journal', getFollows);

export function postFollow(req, res, next) {
	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }

	FollowsJournal.create({
		followerId: user.id,
		journalId: req.body.journalId
	})
	.then(function(newFollow) {
		return [newFollow, createActivity('followedJournal', user.id, req.body.journalId)];
	})
	.spread(function(newFollow, newActivity) {
		return res.status(201).json(newFollow);
	})
	.catch(function(err) {
		console.error('Error in postFollow: ', err);
		return res.status(500).json(err.message);
	});
}
app.post('/follows/journal', postFollow);

export function deleteFollow(req, res, next) {
	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }

	FollowsJournal.destroy({
		where: { followerId: user.id, journalId: req.body.journalId },
		individualHooks: true
	})
	.then(function(destroyedCount) {
		return res.status(201).json(true);
	})
	.catch(function(err) {
		console.error('Error in deleteFollow: ', err);
		return res.status(500).json(err.message);
	});
}
app.delete('/follows/journal', deleteFollow);
