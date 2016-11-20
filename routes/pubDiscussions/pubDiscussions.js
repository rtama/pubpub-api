import app from '../../server';
import { Pub, User, Label, File, Journal, Version, Contributor, FollowsPub, License, InvitedReviewer, Reaction, Role } from '../../models';
import { generateHash } from '../../utilities/generateHash';

const userAttributes = ['id', 'username', 'firstName', 'lastName', 'image'];

export function getDiscussions(req, res, next) {
	// Get user
	// Get all discussions.
	// Filter discussions based on access
	// Return list
	Pub.findAll({
		where: { replyRootPubId: req.query.pubId },
		include: [
			{ model: Contributor, as: 'contributors', include: [{ model: Role, as: 'roles' }, { model: User, as: 'user', attributes: userAttributes }] }, // Filter to remove hidden if not authorized
			{ model: Version, as: 'versions', include: [{ model: File, as: 'files', include: [{ model: File, as: 'sources' }, { model: File, as: 'destinations' }, { model: User, as: 'users' }] }] },
			{ model: Label, as: 'labels' },
			{ model: Reaction, as: 'reactions' },
		]
	})
	.then(function(discussionsData) {
		// Filter through to see if contributor, set isAuthorized
		// Filter discussions
		if (!discussionsData) { return res.status(500).json('Discussions not found'); }
		return res.status(201).json(discussionsData);
	})
	.catch(function(err) {
		console.error('Error in getContributors: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/pub/discussions', getDiscussions);

export function postDiscussion(req, res, next) {
	// authenticate
	// create new pub
	// attach to parent pub
	// Create files, versions, attach those to pub
	// Handle labels
	const user = req.user || {};
	if (!user) { return res.status(500).json('Not authorized'); }
	const newSlug = generateHash().toLowerCase();

	Pub.create({
		title: req.body.title,
		slug: newSlug,
		description: req.body.description,
		previewImage: 'https://assets.pubpub.org/_site/pub.png', 
		replyRootPubId: req.body.replyRootPubId,
		replyParentPubId: req.body.replyParentPubId,
		license: 1, // Set to CCBY
	})
	.then(function(newDiscussion) {
		const createContributor = Contributor.create({
			userId: user.id,
			pubId: newDiscussion.dataValues.id,
			isAuthor: true,
		});
		// Create versions, labels, files here?
		return Promise.all([createContributor]);
	})
	.then(function() {
		return Pub.findOne({
			where: { slug: newSlug },
			include: [
				{ model: Contributor, as: 'contributors', include: [{ model: Role, as: 'roles' }, { model: User, as: 'user', attributes: userAttributes }] }, // Filter to remove hidden if not authorized
				{ model: Version, as: 'versions', include: [{ model: File, as: 'files', include: [{ model: File, as: 'sources' }, { model: File, as: 'destinations' }, { model: User, as: 'users' }] }] },
				{ model: Label, as: 'labels' },
				{ model: Reaction, as: 'reactions' },
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
app.post('/pub/discussions', postDiscussion);

// PUT, DELETE Discussions is not necessary as all of the edits occur through the Pub API routes
