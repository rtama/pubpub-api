import app from '../../server';
import { FollowsPub, User } from '../../models';

const userAttributes = ['id', 'username', 'firstName', 'lastName', 'image', 'bio'];

export function getFollows(req, res, next) {
	// Return a list of users that are following
	FollowsPub.findAll({
		where: { pubId: req.query.pubId },
		include: [
			{ model: User, as: 'user', attributes: userAttributes }, 
		]
	})
	.then(function(followsData) {
		// Filter through to see if contributor, set isAuthorized
		// Filter contributors
		if (!followsData) { return res.status(500).json('FollowsPub data not found'); }
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
app.get('/follows/pub', getFollows);

export function postFollow(req, res, next) {
	const user = req.user || {};
	if (!user) { return res.status(500).json('Not authorized'); }

	FollowsPub.create({
		followerId: user.id,
		pubId: req.body.pubId
	})
	.then(function(newFollow) {
		return res.status(201).json(newFollow);
	})
	.catch(function(err) {
		console.error('Error in postFollow: ', err);
		return res.status(500).json(err.message);
	});
}
app.post('/follows/pub', postFollow);

export function putFollow(req, res, next) {
	const user = req.user || {};
	if (!user) { return res.status(500).json('Not authorized'); }

	const updatedFollow = {};
	Object.keys(req.body).map((key)=> {
		if (['notifyOnVersions', 'notifyOnDiscussions', 'notifyOnJournals', 'notifyOnContributors', 'notifyOnReviewers', 'notifyOnFollowers'].indexOf(key) > -1) {
			updatedFollow[key] = req.body[key];
		} 
	});

	FollowsPub.update(updatedFollow, {
		where: { pubId: req.body.pubId, followerId: user.id }
	})
	.then(function(updatedCount) {
		return res.status(201).json(true);
	})
	.catch(function(err) {
		console.error('Error in putFollow: ', err);
		return res.status(500).json(err.message);
	});
}
app.put('/follows/pub', putFollow);

export function deleteFollow(req, res, next) {
	const user = req.user || {};
	if (!user) { return res.status(500).json('Not authorized'); }

	FollowsPub.destroy({
		where: { followerId: user.id, pubId: req.body.pubId }
	})
	.then(function(destroyedCount) {
		return res.status(201).json(true);
	})
	.catch(function(err) {
		console.error('Error in deleteFollow: ', err);
		return res.status(500).json(err.message);
	});
}
app.delete('/follows/pub', deleteFollow);
