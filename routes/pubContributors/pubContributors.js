import app from '../../server';
import { User, Contributor, Role } from '../../models';

const userAttributes = ['id', 'username', 'firstName', 'lastName', 'image', 'bio'];

export function getContributors(req, res, next) {
	// Get user
	// Get all contributors.
	// Filter contributors based on access
	// Return list
	Contributor.findAll({
		where: { pubId: req.query.pubId },
		include: [
			{ model: Role, as: 'roles' }, 
			{ model: User, as: 'user', attributes: userAttributes }
		]
	})
	.then(function(contributorsData) {
		// Filter through to see if contributor, set isAuthorized
		// Filter contributors
		if (!contributorsData) { return res.status(500).json('Contributors not found'); }
		return res.status(201).json(contributorsData);
	})
	.catch(function(err) {
		console.error('Error in getContributors: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/pub/contributors', getContributors);

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
		if (!contributor || (!contributor.canEdit && !contributor.isAuthor)) {
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
		return res.status(201).json(newContributorData);
	})
	.catch(function(err) {
		console.error('Error in postContributors: ', err);
		return res.status(500).json(err.message);
	});
}
app.post('/pub/contributors', postContributor);

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
		if (!contributorData || (!contributorData.canEdit && !contributorData.isAuthor)) {
			throw new Error('Not Authorized to update this contributor');
		}
		return Contributor.update(updatedContributor, {
			where: { id: req.body.contributorId },
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
app.put('/pub/contributors', putContributor);

export function deleteContributor(req, res, next) {
	// Check if authenticated. Remove. Return true.
	
	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }


	Contributor.findOne({
		where: { userId: user.id, pubId: req.body.pubId },
		raw: true,
	})
	.then(function(contributorData) {
		if (!contributorData || (!contributorData.canEdit && !contributorData.isAuthor)) {
			throw new Error('Not Authorized to update this contributor');
		}
		return Contributor.destroy({
			where: { id: req.body.contributorId },
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
app.delete('/pub/contributors', deleteContributor);
