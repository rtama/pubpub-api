import Promise from 'bluebird';
import app from '../../server';
import { Pub, User, Label, File, Journal, Version, PubReply, PubReaction, Contributor, FollowsPub, License, InvitedReviewer, Reaction, Role, PubSubmit, PubFeature } from '../../models';

const userAttributes = ['id', 'username', 'firstName', 'lastName', 'image', 'bio'];

export function getPub(req, res, next) {
	// Probably should add the option to search by pubId or slug.

	// Check if authenticated
	// Make get request
	// Return
	const user = req.user || {};
	// console.time('pubQueryTime');
	Promise.all([
		Pub.findOne({
			where: { slug: req.query.slug, inactive: { $not: true } },
			include: [
				{ model: Contributor, as: 'contributors', include: [{ model: Role, as: 'roles' }, { model: User, as: 'user', attributes: userAttributes }] }, // Filter to remove hidden if not authorized
				{ model: User, as: 'followers', attributes: userAttributes }, // Filter to remove FollowsPub data from all but user
				{ model: Version, as: 'versions', include: [{ model: File, as: 'files', include: [{ model: File, as: 'sources' }, { model: File, as: 'destinations' }, { model: User, as: 'attributions', attributes: userAttributes }] }] },
				{ model: Pub, 
					as: 'discussions', 
					separate: true,
					include: [
						{ model: Contributor, as: 'contributors', include: [{ model: Role, as: 'roles' }, { model: User, as: 'user', attributes: userAttributes }] }, // Filter to remove hidden if not authorized
						// { model: Version, as: 'versions', include: [{ model: File, as: 'files', include: [{ model: File, as: 'sources' }, { model: File, as: 'destinations' }, { model: User, as: 'attributions', attributes: userAttributes }] }] },
						{ model: Label, as: 'labels' },
						{ model: PubReaction, as: 'pubReactions', include: [{ model: Reaction, as: 'reaction' }] },
					] 
				},
				{ model: Label, as: 'labels', through: { attributes: [] } }, // These are labels applied to the pub
				{ model: Label, separate: true, as: 'pubLabels' }, // These are labels owned by the pub, and used for discussions. 
				{ model: PubSubmit, as: 'pubSubmits', include: [{ model: Journal, as: 'journal' }] },
				{ model: PubFeature, separate: true, as: 'pubFeatures', include: [{ model: Journal, as: 'journal', include: [{ model: Label, as: 'collections' }] }] },
				{ model: Pub, as: 'clones' },
				{ model: InvitedReviewer, as: 'invitedReviewers', attributes: ['name', 'pubId', 'invitedUserId', 'inviterUserId', 'inviterJournalId', 'invitationAccepted', 'invitationRejected', 'rejectionReason'], include: [{ model: User, as: 'invitedUser', attributes: userAttributes }, { model: User, as: 'inviterUser', attributes: userAttributes }, { model: Journal, as: 'inviterJournal' }] },
				{ model: License, as: 'license' },
				{ model: Pub, as: 'cloneParent' },
			]
			// include: [{ all: true }]
		}),
		Reaction.findAll({ raw: true }),
		Role.findAll({ raw: true })
	])
	.spread(function(pubData, reactionsData, rolesData) {
		// console.timeEnd('pubQueryTime');
		if (!pubData) { return res.status(500).json('Pub not found'); }

		const canEdit = pubData.get('contributors').reduce((previous, current)=> {
			if (current.userId === user.id) { return true; }
			return previous;
		}, false);

		if (canEdit) {
			return res.status(201).json({ ...pubData.toJSON(), canEdit: canEdit, allReactions: reactionsData, allRoles: rolesData });
		}

		if (!canEdit && !pubData.get('isPublished')) {
			return res.status(201).json('Not Published');
		}

		const outputPub = {
			...pubData.toJSON(),
			contributors: pubData.get('contributors').filter((contributor)=> {
				return !contributor.isHidden;
			}),
			discussions: pubData.get('discussions').filter((discussion)=> {
				return discussion.isPublished;
			}),
			versions: pubData.get('versions').filter((version)=> {
				return version.isPublished;
			}),
		};

		return res.status(201).json({ ...outputPub, canEdit: canEdit, allReactions: reactionsData, allRoles: rolesData });
	})
	.catch(function(err) {
		console.error('Error in getPub: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/pub', getPub);

export function postPub(req, res, next) {
	// Check if authenticated
	// Make get request
	// Return
	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }


	Pub.create({
		title: req.body.title,
		slug: req.body.slug,
		description: req.body.description,
		previewImage: req.body.previewImage, 
	})
	.then(function(newPub) {
		const createContributor = Contributor.create({
			userId: user.id,
			pubId: newPub.dataValues.id,
			isAuthor: true,
			canEdit: true,
		});

		const createFollow = FollowsPub.create({
			followerId: user.id,
			pubId: newPub.dataValues.id
		});
		// Create default pub-owned labels
		const createLabels = Label.bulkCreate([
			{ pubId: newPub.dataValues.id, title: 'Question', color: '#f39c12' },
			{ pubId: newPub.dataValues.id, title: 'Review', color: '#3498db' },
			{ pubId: newPub.dataValues.id, title: 'Copy editing', color: '#c0392b' },
		]);
		
		return Promise.all([createContributor, createFollow, createLabels]);
	})
	.then(function() {
		return Pub.findOne({
			where: { slug: req.body.slug, inactive: { $not: true } },
			include: [
				{ model: Contributor, as: 'contributors', include: [{ model: Role, as: 'roles' }, { model: User, as: 'user', attributes: userAttributes }] }, 
				{ model: User, as: 'followers', attributes: userAttributes },
			]
		});
	})
	.then(function(pubData) {
		return res.status(201).json(pubData);
	})
	.catch(function(err) {
		console.error('Error in postPub: ', err);
		return res.status(500).json(err.message);
	});
}
app.post('/pub', postPub);

export function putPub(req, res, next) {
	// Used to allow a pub editor to update the pub. 
	// Things like 'distinguishedClone' or fields that are applied by outside users have their own function/authorization check
	
	// Check if authenticated. Update. Return true.

	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }

	// Filter to only allow certain fields to be updated
	const updatedPub = {};
	Object.keys(req.body).map((key)=> {
		if (['slug', 'title', 'description', 'previewImage', 'isClosed', 'hideAuthors', 'customAuthorList', 'licenseId', 'defaultContext'].indexOf(key) > -1) {
			updatedPub[key] = req.body[key];
		} 
	});

	Contributor.findOne({
		where: { userId: user.id, pubId: req.body.pubId },
		raw: true,
	})
	.then(function(contributorData) {
		if (!contributorData || (!contributorData.canEdit && !contributorData.isAuthor)) {
			throw new Error('Not Authorized to update this pub');
		}
		return Pub.update(updatedPub, {
			where: { id: req.body.pubId }
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
app.put('/pub', putPub);

export function deletePub(req, res, next) {
	// Used to set the pub to inactive
	
	// Check if authenticated, update, return true.

	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }

	Contributor.findOne({
		where: { userId: user.id, pubId: req.body.pubId },
		raw: true,
	})
	.then(function(contributorData) {
		if (!contributorData.canEdit && !contributorData.isAuthor) {
			throw new Error('Not Authorized to delete this pub');
		}
		return Pub.update({ inactive: true }, {
			where: { id: req.body.pubId }
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
app.delete('/pub', deletePub);
