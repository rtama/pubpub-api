import app from '../../server';
import { ContributorRole, Contributor, Role } from '../../models';

export function postContributorRole(req, res, next) {
	// Authenticate
	// Add a new contributorrole
	
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
		return ContributorRole.create({
			roleId: req.body.roleId,
			contributorId: req.body.contributorId,
			pubId: req.body.pubId,
		});
	})
	.then(function(newContributorRole) {
		return res.status(201).json(newContributorRole);
	})
	.catch(function(err) {
		console.error('Error in postContributorRoles: ', err);
		return res.status(500).json(err.message);
	});
}
app.post('/pub/contributor/role', postContributorRole);


export function deleteContributorRole(req, res, next) {
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
		return ContributorRole.destroy({
			where: { roleId: req.body.roleId, contributorId: req.body.contributorId, pubId: req.body.pubId, },
			individualHooks: true,
		});
	})
	.then(function(newContributorRole) {
		return res.status(201).json(newContributorRole);
	})
	.catch(function(err) {
		console.error('Error in postContributorRoles: ', err);
		return res.status(500).json(err.message);
	});
}
app.delete('/pub/contributor/role', deleteContributorRole);
