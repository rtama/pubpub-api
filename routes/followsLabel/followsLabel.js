import app from '../../server';
import { FollowsLabel, User } from '../../models';
import { createActivity } from '../../utilities/createActivity';

const userAttributes = ['id', 'username', 'firstName', 'lastName', 'image', 'bio'];

export function getFollows(req, res, next) {
	// Return a list of users that are following
	FollowsLabel.findAll({
		where: { labelId: req.query.labelId },
		include: [
			{ model: User, as: 'user', attributes: userAttributes }, 
		]
	})
	.then(function(followsData) {
		// Filter through to see if contributor, set isAuthorized
		// Filter contributors
		if (!followsData) { return res.status(500).json('FollowsLabel data not found'); }
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
app.get('/follows/label', getFollows);

export function postFollow(req, res, next) {
	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }

	FollowsLabel.create({
		followerId: user.id,
		labelId: req.body.labelId
	})
	.then(function(newFollow) {
		return [newFollow, createActivity('followedLabel', user.id, req.body.labelId)];
	})
	.spread(function(newFollow, newActivity) {
		return res.status(201).json(newFollow);
	})
	.catch(function(err) {
		console.error('Error in postFollow: ', err);
		return res.status(500).json(err.message);
	});
}
app.post('/follows/label', postFollow);

// export function putFollow(req, res, next) {
// 	const user = req.user || {};
// 	if (!user.id) { return res.status(500).json('Not authorized'); }

// 	const updatedFollow = {};
// 	Object.keys(req.body).map((key)=> {
// 		if (['notifyOnPubs', 'notifyOnFollowers'].indexOf(key) > -1) {
// 			updatedFollow[key] = req.body[key];
// 		} 
// 	});

// 	FollowsLabel.update(updatedFollow, {
// 		where: { labelId: req.body.labelId, followerId: user.id }
// 	})
// 	.then(function(updatedCount) {
// 		return res.status(201).json(true);
// 	})
// 	.catch(function(err) {
// 		console.error('Error in putFollow: ', err);
// 		return res.status(500).json(err.message);
// 	});
// }
// app.put('/follows/label', putFollow);

export function deleteFollow(req, res, next) {
	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }

	FollowsLabel.destroy({
		where: { followerId: user.id, labelId: req.body.labelId }
	})
	.then(function(destroyedCount) {
		return res.status(201).json(true);
	})
	.catch(function(err) {
		console.error('Error in deleteFollow: ', err);
		return res.status(500).json(err.message);
	});
}
app.delete('/follows/label', deleteFollow);
