import Promise from 'bluebird';
import app from '../../server';
import { redisClient, Pub, User, Label, File, Journal, Version, PubReaction, Contributor, FollowsPub, License, InvitedReviewer, JournalAdmin, Reaction, Role, PubSubmit, PubFeature } from '../../models';
import { userAttributes } from '../user/user';

export function queryForPub(value) {
	const where = isNaN(value) 
		? { slug: value, inactive: { $not: true } }
		: { id: value, inactive: { $not: true } };
	return Pub.findOne({
		where: where,
		include: [
			{ model: Contributor, separate: true, as: 'contributors', include: [{ model: Role, as: 'roles' }, { model: User, as: 'user', attributes: userAttributes }] }, // Filter to remove hidden if not authorized
			{ model: User, as: 'followers', attributes: userAttributes }, // Filter to remove FollowsPub data from all but user
			// { model: FollowsPub, as: 'FollowsPubs', include: [{ model: User, as: 'user', attributes: userAttributes }] }, 
			{ model: Version, separate: true, as: 'versions', include: [{ model: File, as: 'files', include: [{ model: File, as: 'sources' }, { model: File, as: 'destinations' }, { model: User, as: 'attributions', attributes: userAttributes }] }] },
			{ model: Pub, 
				as: 'discussions', 
				separate: true,
				include: [
					{ model: Contributor, separate: true, as: 'contributors', include: [{ model: Role, as: 'roles' }, { model: User, as: 'user', attributes: userAttributes }] }, // Filter to remove hidden if not authorized
					{ model: Label, as: 'labels' },
					{ model: PubReaction, as: 'pubReactions', include: [{ model: Reaction, as: 'reaction' }] },
				] 
			},
			{ model: Label, as: 'labels', through: { attributes: [] } }, // These are labels applied to the pub
			{ model: Label, separate: true, as: 'pubLabels' }, // These are labels owned by the pub, and used for discussions. 
			{ model: PubSubmit, separate: true, as: 'pubSubmits', include: [{ model: Journal, as: 'journal', include: [{ model: JournalAdmin, as: 'admins' }] }] },
			{ model: PubFeature, separate: true, as: 'pubFeatures', include: [{ model: Journal, as: 'journal', include: [{ model: Label, as: 'collections' }] }] },
			{ model: Pub, separate: true, as: 'clones' },
			{ model: InvitedReviewer, separate: true, as: 'invitedReviewers', attributes: ['name', 'pubId', 'invitedUserId', 'inviterUserId', 'inviterJournalId', 'invitationAccepted', 'invitationRejected', 'rejectionReason'], include: [{ model: User, as: 'invitedUser', attributes: userAttributes }, { model: User, as: 'inviterUser', attributes: userAttributes }, { model: Journal, as: 'inviterJournal' }] },
			{ model: License, as: 'license' },
			{ model: Pub, as: 'cloneParent' },
		]
		// include: [{ all: true }]
	});
}

export function getPub(req, res, next) {
	// Define Redis KEY
	// Check Redis, return
	// Find Postrgres, Set Redis, return
	// Define when this needs to be invalidated.

	// Probably should add the option to search by pubId or slug.

	// Check if authenticated
	// Make get request
	// Return
	const user = req.user || {};
	console.time('pubQueryTime');

	redisClient.getAsync('p_' + req.query.slug).then(function(redisResult) {
		if (redisResult) { return redisResult; }
		return queryForPub(req.query.slug);
	})
	.then(function(pubData) {
		if (!pubData) { return res.status(500).json('Pub not found'); }
		const outputData = pubData.toJSON ? pubData.toJSON() : JSON.parse(pubData);
		console.log('Using Cache: ', !pubData.toJSON);
		const setCache = pubData.toJSON ? redisClient.setexAsync('p_' + req.query.slug, 120, JSON.stringify(outputData)) : {};
		return Promise.all([outputData, Reaction.findAll({ raw: true }), Role.findAll({ raw: true }), setCache]);
	})
	.spread(function(pubData, reactionsData, rolesData) {
		console.timeEnd('pubQueryTime');
		console.time('pubProcessTime');

		const canEdit = pubData.contributors.reduce((previous, current)=> {
			if (current.userId === user.id && (current.canEdit || current.isAuthor)) { return true; }
			return previous;
		}, false);

		const canRead = pubData.contributors.reduce((previous, current)=> {
			if (current.userId === user.id && current.canRead) { return true; }
			return previous;
		}, false);

		const pubSubmitsAdmins = pubData.pubSubmits.reduce((previous, current)=> {
			return [...previous, ...current.journal.admins];
		}, []);

		const isJournalReviewer = pubSubmitsAdmins.reduce((previous, current)=> {
			if (current.userId === user.id) { return true; }
			return previous;
		}, false);

		const isInvitedReviewer = pubData.invitedReviewers.reduce((previous, current)=> {
			if (current.invitedUserId === user.id) { return true; }
			return previous;
		}, false);

		const canReadRestricted = isJournalReviewer || isInvitedReviewer;

		if (!(canEdit || canRead || canReadRestricted) && !pubData.isPublished) {
			console.timeEnd('pubProcessTime');
			return res.status(201).json('Not Published');
		}

		if (!(canEdit || canRead) && canReadRestricted && !pubData.isPublished && !pubData.isRestricted) {
			console.timeEnd('pubProcessTime');
			return res.status(201).json('Not Published');
		}

		const outputPub = {
			...pubData,
			contributors: pubData.contributors.filter((contributor)=> {
				if (canEdit || canRead) { return true; }
				return !contributor.isHidden;
			}),
			discussions: pubData.discussions.filter((discussion)=> {
				if (canEdit || canRead) { return true; }
				return discussion.isPublished;
			}),
			versions: pubData.versions.filter((version)=> {
				if (canEdit || canRead) { return true; }
				if (canReadRestricted) { return version.isPublished || version.isRestricted; }
				return version.isPublished;
			}),
		};

		console.timeEnd('pubProcessTime');
		return res.status(201).json({ ...outputPub, canEdit: canEdit, canRead: canRead, canReadRestricted: canReadRestricted, allReactions: reactionsData, allRoles: rolesData });
	})
	.catch(function(err) {
		console.error('Error in getPub: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/pub', getPub);

export function postPub(req, res, next) {
	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }


	Pub.create({
		title: req.body.title.trim(),
		slug: req.body.slug.trim(),
		description: req.body.description.trim(),
		avatar: req.body.avatar, 
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
		if (['slug', 'title', 'description', 'avatar', 'isClosed', 'hideAuthors', 'customAuthorList', 'licenseId', 'defaultContext'].indexOf(key) > -1) {
			updatedPub[key] = req.body[key].trim ? req.body[key].trim() : req.body[key];
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
			where: { id: req.body.pubId },
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
			where: { id: req.body.pubId },
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
app.delete('/pub', deletePub);
