import app from '../../server';
import { User, Journal, InvitedReviewer } from '../../models';
import { generateHash } from '../../utilities/generateHash';

const userAttributes = ['id', 'username', 'firstName', 'lastName', 'image'];

export function getReviewers(req, res, next) {
	// Return all reviewers
	InvitedReviewer.findAll({
		where: { pubId: req.query.pubId },
		attributes: ['name', 'pubId', 'invitedUserId', 'inviterUserId', 'inviterJournalId'],
		include: [
			{ model: User, as: 'invitedUser', attributes: userAttributes }, 
			{ model: User, as: 'inviterUser', attributes: userAttributes }, 
			{ model: Journal, as: 'inviterJournal' }
		]
	})
	.then(function(invitedReviewers) {
		return res.status(201).json(invitedReviewers);
	})
	.catch(function(err) {
		console.error('Error in getReviewers: ', err);
		return res.status(500).json(err.message);
	});

}
app.get('/pub/reviewers', getReviewers);

export function postReviewer(req, res, next) {
	// Either email and name, or invitedUserId is required
	// create a new reviewer
	// attach to pub?
	// Return new review object
	const user = req.user || {};
	if (!user) { return res.status(500).json('Not authorized'); }

	InvitedReviewer.create({
		email: req.body.email,
		name: req.body.name,
		invitationHash: generateHash(),
		pubId: req.body.pubId,
		invitedUserId: req.body.invitedUserId,
		inviterUserId: user.id,
		inviterJournalId: req.body.inviterJournalId
	})
	.then(function(newInvitedReviewer) {
		return InvitedReviewer.findOne({
			where: { id: newInvitedReviewer.id },
			attributes: ['name', 'pubId', 'invitedUserId', 'inviterUserId', 'inviterJournalId'], 
			include: [
				{ model: User, as: 'invitedUser', attributes: userAttributes }, 
				{ model: User, as: 'inviterUser', attributes: userAttributes }, 
				{ model: Journal, as: 'inviterJournal' }
			],
		});
	})
	.then(function(invitedReviewerData) {
		return res.status(201).json(invitedReviewerData);
	})
	.catch(function(err) {
		console.error('Error in postReviewers: ', err);
		return res.status(500).json(err.message);
	});
}
app.post('/pub/reviewers', postReviewer);

export function putReviewer(req, res, next) {
	// Authenticate
	// Can set review to accepted/declined
	// Authenticate that the person making this change is allowed. 
	const user = req.user || {};
	if (!user) { return res.status(500).json('Not authorized'); }

	const updatedReviewer = {
		invitationAccepted: req.body.invitationAccepted,
		invitationRejected: req.body.invitationRejected,
		rejectionReason: req.body.rejectionReason,
	};

	InvitedReviewer.update(updatedReviewer, {
		where: { invitationHash: req.body.invitationHash }
	})
	.then(function(updatedCount) {
		return res.status(201).json(true);
	})
	.catch(function(err) {
		console.error('Error in putUser: ', err);
		return res.status(500).json(err.message);
	});
}
app.put('/pub/reviewers', putReviewer);
