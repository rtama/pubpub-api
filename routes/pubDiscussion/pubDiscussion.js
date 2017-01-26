import app from '../../server';
import { Pub, User, Label, PubLabel, Contributor, Reaction, Role, PubReaction } from '../../models';
import { generateHash } from '../../utilities/generateHash';
import { createActivity } from '../../utilities/createActivity';
import { userAttributes } from '../user/user';

export function postDiscussion(req, res, next) {
	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }
	
	const newSlug = generateHash().toLowerCase();
	
	let findThreadNumber;
	if (req.body.replyRootPubId === req.body.replyParentPubId) {
		// If it is a top-level discussion, find its new threadNumber
		findThreadNumber = Pub.max('threadNumber', {
			where: { 
				replyRootPubId: req.body.replyRootPubId,
				// isPublished: !req.body.isPrivate
			}
		})
		.then(function(maxThreadNumber) {
			return maxThreadNumber ? maxThreadNumber + 1 : 1;
		});
	} else {
		// If it's a child, find it's parent's thread number
		findThreadNumber = Pub.findOne({
			where: { id: req.body.replyParentPubId },
			attributes: ['threadNumber']
		})
		.then(function(pubData) {
			return pubData.get('threadNumber');
		});
	}
	
	findThreadNumber
	.then(function(threadNumber) {
		return Pub.create({
			title: req.body.title,
			slug: newSlug,
			description: req.body.description,
			avatar: 'https://assets.pubpub.org/_site/pub.png', 
			replyRootPubId: req.body.replyRootPubId,
			replyParentPubId: req.body.replyParentPubId,
			isPublished: !req.body.isPrivate, // TODO: Check to make sure the user has canEdit or canRead permission, thus allowing them to post private discussions.
			threadNumber: threadNumber,
			license: 1, // Set to CCBY
		});
	})
	.then(function(newDiscussion) {
		if (req.body.replyRootPubId !== req.body.replyParentPubId) {
			return [newDiscussion, createActivity('newReply', user.id, req.body.replyRootPubId, newDiscussion.id)];	
		}
		return [newDiscussion, createActivity('newDiscussion', user.id, req.body.replyRootPubId, newDiscussion.id)];
	})
	.spread(function(newDiscussion, newActivity) {
		const createContributor = Contributor.create({
			userId: user.id,
			pubId: newDiscussion.dataValues.id,
			isAuthor: true,
		});
		const labels = req.body.labels || [];
		const newLabels = labels.map((labelId)=> {
			return { pubId: newDiscussion.dataValues.id, labelId: labelId };
		});
		const createPubLabels = PubLabel.bulkCreate(newLabels);

		// Create versions, labels, files here?
		return Promise.all([createContributor, createPubLabels]);
	})
	.then(function() {
		return Pub.findOne({
			where: { slug: newSlug },
			include: [
				{ model: Contributor, as: 'contributors', include: [{ model: Role, as: 'roles' }, { model: User, as: 'user', attributes: userAttributes }] }, // Filter to remove hidden if not authorized
				// { model: Version, as: 'versions', include: [{ model: File, as: 'files', include: [{ model: File, as: 'sources' }, { model: File, as: 'destinations' }, { model: User, as: 'users' }] }] },
				{ model: Label, as: 'labels' },
				{ model: PubReaction, as: 'pubReactions', include: [{ model: Reaction, as: 'reaction' }] },
			]
		});
	})
	.then(function(discussionData) {
		return res.status(201).json(discussionData);
	})
	.catch(function(err) {
		console.error('Error in postPub: ', err);
		return res.status(500).json(err.message);
	});
}
app.post('/pub/discussion', postDiscussion);

export function putPubDiscussion(req, res, next) {

	// Used to allow Pub authors to close discussions linked to their pub.

	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }

	// Filter to only allow certain fields to be updated
	const updatedPub = {};
	Object.keys(req.body).map((key)=> {
		if (['isClosed'].indexOf(key) > -1) {
			updatedPub[key] = req.body[key] && req.body[key].trim ? req.body[key].trim() : req.body[key];
		} 
	});

	Contributor.findOne({
		where: { userId: user.id, pubId: req.body.replyRootPubId },
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
		console.error('Error in putPubDiscussion: ', err);
		return res.status(500).json(err.message);
	});
}
app.put('/pub/discussion', putPubDiscussion);

// DELETE Discussions is not necessary as all of the edits occur through the Pub API routes
