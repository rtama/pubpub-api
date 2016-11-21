import app from '../../server';
import { JournalAdmin, ContributorRole, Contributor, Role } from '../../models';

export function getContributorRoles(req, res, next) {
	// Probably should return all labels associated to journal
	// Do we populate pubs associated with those labels?
	Contributor.findOne({
		where: { id: req.query.contributorId },
		include: [{ model: Role, as: 'roles' }]
	})
	.then(function(contributorRolesData) {
		if (!contributorRolesData || (contributorRolesData.roles && !contributorRolesData.roles.length)) { return res.status(500).json('ContributorRoles not found'); }
		return res.status(201).json(contributorRolesData.roles);
	})
	.catch(function(err) {
		console.error('Error in getContributorRoles: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/pub/contributor/roles', getContributorRoles);

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
app.post('/pub/contributor/roles', postContributorRole);


export function deleteContributorRole(req, res, next) {
	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }

	Contributor.findOne({
		where: { pubId: req.body.pubId, userId: user.id, id: req.body.contributorId },
		raw: true,
	})
	.then(function(contributor) {
		if (!contributor || (!contributor.canEdit && !contributor.isAuthor)) {
			throw new Error('Not Authorized to edit this pub');
		}
		return ContributorRole.destroy({
			where: { roleId: req.body.roleId, contributorId: req.body.contributorId }
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
app.delete('/pub/contributor/roles', deleteContributorRole);
