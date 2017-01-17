import app from '../../server';
import { Pub, User, Journal, InvitedReviewer } from '../../models';
import { generateSignUp } from '../signUp/signUp';
import { generateHash } from '../../utilities/generateHash';
import { createActivity } from '../../utilities/createActivity';
import { sendEmail } from '../../utilities/sendEmail';

// TODO: is invitationHash needed? We just use the user's id/email to verify the invitation...
import { userAttributes } from '../user/user';

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
			// invitationHash: generateHash(),
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
			? invitedReviewerData.inviterUser.firstName + ' ' + invitedReviewerData.inviterUser.lastName + ' from ' + invitedReviewerData.inviterJournal.name
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


	// let createReviewer;
	// if (req.body.email) {
	// 	createReviewer = User.findOne({ email: req.body.email })
	// 	.then(function(userData) {
	// 		// if (userData) {
	// 		// 	return InvitedReviewer.create({
	// 		// 		email: null,
	// 		// 		name: null,
	// 		// 		invitationHash: generateHash(),
	// 		// 		pubId: req.body.pubId,
	// 		// 		invitedUserId: userData.id,
	// 		// 		inviterUserId: user.id,
	// 		// 		inviterJournalId: req.body.inviterJournalId
	// 		// 	});
	// 		// }
	// 		// return InvitedReviewer.create({
	// 		// 	email: req.body.email,
	// 		// 	name: req.body.name,
	// 		// 	invitationHash: generateHash(),
	// 		// 	pubId: req.body.pubId,
	// 		// 	invitedUserId: null,
	// 		// 	inviterUserId: user.id,
	// 		// 	inviterJournalId: req.body.inviterJournalId
	// 		// })
	// 		// .then(function(newInvitedReviewer) {
	// 		// 	const signUpPromise = generateSignUp(req.body.email);
	// 		// 	return Promise.all([newInvitedReviewer, signUpPromise]);
	// 		// })
	// 		// .spread(function(newInvitedReviewer, signUpData) {
	// 		// 	const findPub = Pub.findOne({ where: { id: req.body.pubId } });
	// 		// 	const findInviterUser = User.findOne({ where: { id: req.body.inviterUserId } });
	// 		// 	const findInviterJournal = Journal.findOne({ where: { id: req.body.inviterJournalId } });
	// 		// 	return Promise.all([newInvitedReviewer, signUpData, findPub, findInviterUser, findInviterJournal]);
	// 		// })
	// 		.spread(function(newInvitedReviewer, signUpData, pubData, inviterUserData, inviterJournalData) {
	// 			const hash = signUpData.hash;
	// 			const templateId = 1219221;
	// 			const templateModel = {
	// 				inviter_title: 'John from JoDS',
	// 				pub_title: 'Fourier Transforms',
	// 				pub_url: 'https://www.pubpub.org/pub',
	// 				action_url: 'https://signup.com',
	// 				action_text: 'Sign up and Review'
	// 			};
	// 			const sendEmailPromise = sendEmail(email, templateId, templateModel);
	// 			return Promise.all([newInvitedReviewer, sendEmailPromise]);
	// 		})
	// 		.spread(function(newInvitedReviewer, emailResult) {
	// 			return newInvitedReviewer;
	// 		});
	// 	});
	// } else {
	// 	createReviewer = InvitedReviewer.create({
	// 		email: req.body.email,
	// 		name: req.body.name,
	// 		invitationHash: generateHash(),
	// 		pubId: req.body.pubId,
	// 		invitedUserId: req.body.invitedUserId,
	// 		inviterUserId: user.id,
	// 		inviterJournalId: req.body.inviterJournalId
	// 	});
	// }
	
	// createReviewer.then(function(newInvitedReviewer) {
	// 	return InvitedReviewer.findOne({
	// 		where: { id: newInvitedReviewer.id },
	// 		attributes: ['name', 'pubId', 'invitedUserId', 'inviterUserId', 'inviterJournalId'], 
	// 		include: [
	// 			{ model: User, as: 'invitedUser', attributes: userAttributes }, 
	// 			{ model: User, as: 'inviterUser', attributes: userAttributes }, 
	// 			{ model: Journal, as: 'inviterJournal' }
	// 		],
	// 	});
	// })
	// .then(function(invitedReviewerData) {
	// 	if (req.body.invitedUserId) {
	// 		return [invitedReviewerData, createActivity('invitedReviewer', user.id, req.body.pubId, req.body.invitedUserId)];	
	// 	}
	// 	return [invitedReviewerData, {}];
	// })
	// .spread(function(invitedReviewerData, newActivity) {
	// 	return res.status(201).json(invitedReviewerData);
	// })
	// .catch(function(err) {
	// 	console.error('Error in postReviewers: ', err);
	// 	return res.status(500).json(err.message);
	// });
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
app.put('/pub/reviewers', putReviewer);
