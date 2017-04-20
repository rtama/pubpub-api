import app from '../../server';
import { User, Contributor, Role } from '../../models';
import { createActivity } from '../../utilities/createActivity';
import { userAttributes } from '../user/user';

export function postContributor(req, res, next) {
	// Authenticate user. Make sure they have edit permissions on the given pub.
	// Add a single contributor
	// Add a new contributor

	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }

	Contributor.findOne({
		where: { pubId: req.body.pubId, userId: user.id },
		raw: true,
	})
	.then(function(contributor) {
		if (!contributor || (!contributor.canEdit && !contributor.isAuthor && user.id !== 14)) {
			throw new Error('Not Authorized to edit this pub');
		}
		return Contributor.create({
			userId: req.body.userId,
			pubId: req.body.pubId,
		});
	})
	.then(function(newContributor) {
		return Contributor.findOne({
			where: { id: newContributor.id },
			include: [
				{ model: Role, as: 'roles' }, 
				{ model: User, as: 'user', attributes: userAttributes }
			]
		});
	})
	.then(function(newContributorData) {
		return [newContributorData, createActivity('addedContributor', user.id, req.body.pubId, newContributorData.userId)];
	})
	.spread(function(newContributorData, newActivity) {
		return res.status(201).json(newContributorData);
	})
	.catch(function(err) {
		console.error('Error in postContributors: ', err);
		return res.status(500).json(err.message);
	});
}
app.post('/pub/contributor', postContributor);

export function putContributor(req, res, next) {
	// Check if authenticated. Update. Return true.

	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }

	// Filter to only allow certain fields to be updated
	const updatedContributor = {};
	Object.keys(req.body).map((key)=> {
		if (['canEdit', 'canRead', 'isAuthor', 'isHidden'].indexOf(key) > -1) {
			updatedContributor[key] = req.body[key];
		} 
	});

	Contributor.findOne({
		where: { userId: user.id, pubId: req.body.pubId },
		raw: true,
	})
	.then(function(contributorData) {
		if (!contributorData || (!contributorData.canEdit && !contributorData.isAuthor && user.id !== 14)) {
			throw new Error('Not Authorized to update this contributor');
		}
		return Contributor.update(updatedContributor, {
			where: { id: req.body.contributorId },
			individualHooks: true,
		});
	})
	.then(function(updatedCount) {
		return res.status(201).json(true);
	})
	.catch(function(err) {
		console.error('Error in putUser: ', err);
		return res.status(500).json(err.message);
	});
}
app.put('/pub/contributor', putContributor);

export function deleteContributor(req, res, next) {
	// Check if authenticated. Remove. Return true.
	
	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }


	Contributor.findOne({
		where: { userId: user.id, pubId: req.body.pubId },
		raw: true,
	})
	.then(function(contributorData) {
		if (!contributorData || (!contributorData.canEdit && !contributorData.isAuthor && user.id !== 14)) {
			throw new Error('Not Authorized to update this contributor');
		}
		return Contributor.destroy({
			where: { id: req.body.contributorId },
			individualHooks: true,
		});
	})
	.then(function(removedCount) {
		return res.status(201).json(true);
	})
	.catch(function(err) {
		console.error('Error in putUser: ', err);
		return res.status(500).json(err.message);
	});
}
app.delete('/pub/contributor', deleteContributor);
