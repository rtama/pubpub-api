import app from '../../server';
import { Pub, User, Journal, InvitedReviewer } from '../../models';
import { generateSignUp } from '../signUp/signUp';
import { createActivity } from '../../utilities/createActivity';
import { sendEmail } from '../../utilities/sendEmail';

import { userAttributes } from '../user/user';

export function postReviewer(req, res, next) {
	// Either email and name, or invitedUserId is required
	// create a new reviewer
	// attach to pub?
	// Return new review object
	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }

	// If the user exists, invite
	// If an email, check if the email is already used, and then invite that user
	// If an email, and doesn't exist, create signup, send link to invited
		// When they accept/reject the invite, update the invite with their userId
	User.findOne({ where: { email: req.body.email } })
	.then(function(userData) {
		const foundUser = userData || {};
		const newReviewer = {
			email: foundUser.id ? null : req.body.email,
			name: foundUser.id ? null : req.body.name,
			pubId: req.body.pubId,
			invitedUserId: foundUser.id ? foundUser.id : req.body.invitedUserId,
			inviterUserId: user.id,
			inviterJournalId: req.body.inviterJournalId
		};
		return InvitedReviewer.create(newReviewer);
	})
	.then(function(newInvitedReviewer) {
		return InvitedReviewer.findOne({
			where: { id: newInvitedReviewer.id },
			attributes: ['name', 'pubId', 'invitedUserId', 'inviterUserId', 'inviterJournalId'], 
			include: [
				{ model: User, as: 'invitedUser', attributes: [...userAttributes, 'email'] }, 
				{ model: User, as: 'inviterUser', attributes: userAttributes }, 
				{ model: Journal, as: 'inviterJournal' },
				{ model: Pub, as: 'pub' }
			],
		});
	})
	.then(function(invitedReviewerData) {
		let signUpPromise = {};
		if (!invitedReviewerData.invitedUserId) {
			signUpPromise = generateSignUp(req.body.email);
		}
		return Promise.all([invitedReviewerData, signUpPromise]);
	})
	.spread(function(invitedReviewerData, signUpData) {
		const hash = signUpData.hash;
		const templateId = 1219221;
		const inviterTitle = invitedReviewerData.inviterJournal
			? invitedReviewerData.inviterUser.firstName + ' ' + invitedReviewerData.inviterUser.lastName + ' from ' + invitedReviewerData.inviterJournal.title
			: invitedReviewerData.inviterUser.firstName + ' ' + invitedReviewerData.inviterUser.lastName;

		const pubPathname = '/pub/' + invitedReviewerData.pub.slug;
		const actionUrl = hash
			? 'https://www.pubpub.org/users/create/' + hash + '?redirect=' + pubPathname
			: 'https://www.pubpub.org' + pubPathname;
		const actionText = hash
			? 'Sign Up and Review'
			: 'Review Pub';

		const templateModel = {
			inviter_title: inviterTitle,
			pub_title: invitedReviewerData.pub.title,
			pub_url: 'https://www.pubpub.org' + pubPathname,
			action_url: actionUrl,
			action_text: actionText
		};
		const email = invitedReviewerData.invitedUser ? invitedReviewerData.invitedUser.email : req.body.email;
		const sendEmailPromise = sendEmail(email, templateId, templateModel);
		return Promise.all([invitedReviewerData, sendEmailPromise]);
	})
	.spread(function(invitedReviewerData, emailResult) {
		if (req.body.invitedUserId) {
			return [invitedReviewerData, createActivity('invitedReviewer', user.id, req.body.pubId, req.body.invitedUserId)];	
		}
		return [invitedReviewerData, {}];
	})
	.spread(function(invitedReviewerData, newActivity) {
		const outputData = invitedReviewerData.toJSON();
		if (outputData.invitedUser) {
			outputData.invitedUser.email = undefined;	
		}
		
		return res.status(201).json(outputData);
	})
	.catch(function(err) {
		console.error('Error in postReviewers: ', err);
		return res.status(500).json(err.message);
	});
}
app.post('/pub/reviewer', postReviewer);

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
			pubId: req.body.pubId,
			invitedUserId: user.id
		},
		returning: true,
		individualHooks: true
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
app.put('/pub/reviewer', putReviewer);
