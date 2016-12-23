import app from '../../server';
import { User, Journal, InvitedReviewer } from '../../models';
import { generateHash } from '../../utilities/generateHash';
import { createActivity } from '../../utilities/createActivity';

const userAttributes = ['id', 'username', 'firstName', 'lastName', 'image', 'bio'];

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
	if (!user.id) { return res.status(500).json('Not authorized'); }

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
		if (req.body.invitedUserId) {
			return [invitedReviewerData, createActivity('invitedReviewer', user.id, req.body.pubId, req.body.invitedUserId)];	
		}
		return [invitedReviewerData, {}];
	})
	.spread(function(invitedReviewerData, newActivity) {
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
	if (!user.id) { return res.status(500).json('Not authorized'); }

	const updatedReviewer = {
		invitationAccepted: req.body.invitationAccepted,
		invitationRejected: req.body.invitationRejected,
		rejectionReason: req.body.rejectionReason,
	};

	InvitedReviewer.update(updatedReviewer, {
		where: { 
			invitationHash: req.body.invitationHash
		},
		returning: true,
	})
	.then(function(updatedInvitation) {
		if (req.body.invitationAccepted && updatedInvitation[1][0]) {
			return [updatedInvitation, createActivity('acceptedReviewInvitation', user.id, updatedInvitation[1][0].pubId, updatedInvitation[1][0].inviterJournalId || updatedInvitation[1][0].inviterUserId)];	
		}
		return [updatedInvitation, {}];
	})
	.spread(function(updatedInvitation, newActivity) {
		return res.status(201).json(true);
	})
	.catch(function(err) {
		console.error('Error in putUser: ', err);
		return res.status(500).json(err.message);
	});
}
app.put('/pub/reviewers', putReviewer);
