import app from '../../server';
import { FollowsUser, User } from '../../models';
import { createActivity } from '../../utilities/createActivity';

const userAttributes = ['id', 'username', 'firstName', 'lastName', 'image', 'bio'];

export function getFollows(req, res, next) {
	// Return a list of users that are following
	FollowsUser.findAll({
		where: { userId: req.query.userId },
		include: [
			{ model: User, as: 'user', attributes: userAttributes }, 
		]
	})
	.then(function(followsData) {
		// Filter through to see if contributor, set isAuthorized
		// Filter contributors
		if (!followsData) { return res.status(500).json('FollowsUser data not found'); }
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
app.get('/follows/user', getFollows);

export function postFollow(req, res, next) {
	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }

	FollowsUser.create({
		followerId: user.id,
		userId: req.body.userId
	})
	.then(function(newFollow) {
		return [newFollow, createActivity('followedUser', user.id, req.body.userId)];
	})
	.spread(function(newFollow, newActivity) {
		return res.status(201).json(newFollow);
	})
	.catch(function(err) {
		console.error('Error in postFollow: ', err);
		return res.status(500).json(err.message);
	});
}
app.post('/follows/user', postFollow);

// export function putFollow(req, res, next) {
// 	const user = req.user || {};
// 	if (!user.id) { return res.status(500).json('Not authorized'); }

// 	const updatedFollow = {};
// 	Object.keys(req.body).map((key)=> {
// 		if (['notifyOnPubs', 'notifyOnJournals', 'notifyOnDiscussions', 'notifyOnReviews', 'notifyOnFollows', 'notifyOnFollowers'].indexOf(key) > -1) {
// 			updatedFollow[key] = req.body[key];
// 		} 
// 	});

// 	FollowsUser.update(updatedFollow, {
// 		where: { userId: req.body.userId, followerId: user.id }
// 	})
// 	.then(function(updatedCount) {
// 		return res.status(201).json(true);
// 	})
// 	.catch(function(err) {
// 		console.error('Error in putFollow: ', err);
// 		return res.status(500).json(err.message);
// 	});
// }
// app.put('/follows/user', putFollow);

export function deleteFollow(req, res, next) {
	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }

	FollowsUser.destroy({
		where: { followerId: user.id, userId: req.body.userId }
	})
	.then(function(destroyedCount) {
		return res.status(201).json(true);
	})
	.catch(function(err) {
		console.error('Error in deleteFollow: ', err);
		return res.status(500).json(err.message);
	});
}
app.delete('/follows/user', deleteFollow);
