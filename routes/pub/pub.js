import Promise from 'bluebird';
import app from '../../server';
import { Pub, User, Label, File, Journal, Version, Contributor, FollowsPub, License, InvitedReviewer, Reaction, Role, PubSubmit, PubFeature } from '../../models';

const userAttributes = ['id', 'username', 'firstName', 'lastName', 'image'];

export function getPub(req, res, next) {
	// Probably should add the option to search by pubId or slug.

	// Check if authenticated
	// Make get request
	// Return
	const user = req.user || {};
	// console.time('pubQueryTime');
	Pub.findOne({
		where: { slug: req.query.slug, inactive: { $not: true } },
		include: [
			{ model: Contributor, as: 'contributors', include: [{ model: Role, as: 'roles' }, { model: User, as: 'user', attributes: userAttributes }] }, // Filter to remove hidden if not authorized
			{ model: User, as: 'followers', attributes: userAttributes }, // Filter to remove FollowsPub data from all but user
			{ model: Version, as: 'versions', include: [{ model: File, as: 'files', include: [{ model: File, as: 'sources' }, { model: File, as: 'destinations' }, { model: User, as: 'attributions', attributes: userAttributes }] }] },
			{ model: Pub, 
				as: 'discussions', 
				include: [
					{ model: Contributor, as: 'contributors', include: [{ model: Role, as: 'roles' }, { model: User, as: 'user', attributes: userAttributes }] }, // Filter to remove hidden if not authorized
					{ model: Version, as: 'versions', include: [{ model: File, as: 'files', include: [{ model: File, as: 'sources' }, { model: File, as: 'destinations' }, { model: User, as: 'attributions', attributes: userAttributes }] }] },
					{ model: Label, as: 'labels' },
					{ model: Reaction, as: 'reactions' },
				] 
			},
			{ model: Label, as: 'labels', through: { attributes: [] } }, // These are labels applied to the pub
			{ model: Label, as: 'pubLabels' }, // These are labels owned by the pub, and used for discussions. 
			// { model: Journal, as: 'journalsFeatured' },
			// { model: Journal, as: 'journalsSubmitted' },
			{ model: PubSubmit, as: 'pubSubmits', include: [{ model: Journal, as: 'journal' }] },
			{ model: PubFeature, as: 'pubFeatures', include: [{ model: Journal, as: 'journal' }] },
			{ model: Pub, as: 'clones' },
			{ model: InvitedReviewer, as: 'invitedReviewers', attributes: ['name', 'pubId', 'invitedUserId', 'inviterUserId', 'inviterJournalId'], include: [{ model: User, as: 'invitedUser', attributes: userAttributes }, { model: User, as: 'inviterUser', attributes: userAttributes }, { model: Journal, as: 'inviterJournal' }] },
			{ model: License, as: 'license' },
			{ model: Pub, as: 'cloneParent' }, // I think we may have to add a belongsTo
		]
		// include: [{ all: true }]
	})
	.then(function(pubData) {
		// Filter through to see if contributor, set isAuthorized
		// Filter versions, if 0 versions available and not authorized, throw error
		// Filter contributors
		// Filter discussions
		// console.timeEnd('pubQueryTime');
		if (!pubData) { return res.status(500).json('Pub not found'); }
		return res.status(201).json(pubData);
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
	if (!user) { return res.status(500).json('Not authorized'); }


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
		});

		const createFollow = FollowsPub.create({
			followerId: user.id,
			pubId: newPub.dataValues.id
		});
		return Promise.all([createContributor, createFollow]);
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
	if (!user) { return res.status(500).json('Not authorized'); }

	// Filter to only allow certain fields to be updated
	const updatedPub = {};
	Object.keys(req.body).map((key)=> {
		if (['slug', 'title', 'description', 'previewImage', 'isClosed', 'hideAuthors', 'customAuthorList', 'licenseId'].indexOf(key) > -1) {
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
	if (!user) { return res.status(500).json('Not authorized'); }

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
