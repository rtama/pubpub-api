import Promise from 'bluebird';
import app from '../../server';
import { Pub, User, Label, JournalAdmin, Journal, FollowsJournal, InvitedReviewer } from '../../models';

const userAttributes = ['id', 'username', 'firstName', 'lastName', 'image'];

export function getJournal(req, res, next) {
	// Probably should add the option to search by pubId or slug.

	// Check if authenticated
	// Make get request
	// Return
	const user = req.user || {};
	Journal.findOne({
		where: { slug: req.query.slug, inactive: { $not: true } },
		include: [
			{ model: User, as: 'admins', attributes: userAttributes }, 
			{ model: User, as: 'followers', attributes: userAttributes }, 
			{ model: Label, as: 'collections' }, // These are labels owned by the pub, and used for discussions. 
			{ model: Pub, as: 'pubsFeatured', include: [{ model: Label, as: 'labels', through: { attributes: [] } }] },
			{ model: Pub, as: 'pubsSubmitted' },
			{ model: InvitedReviewer, as: 'invitationsCreated', attributes: ['name', 'pubId', 'invitedUserId', 'inviterUserId', 'inviterJournalId'], include: [{ model: User, as: 'invitedUser', attributes: userAttributes }, { model: User, as: 'inviterUser', attributes: userAttributes }] },
		]
		// include: [{ all: true }]
	})
	.then(function(journalData) {
		// Filter through to see if admin, set isAuthorized
		if (!journalData) { return res.status(500).json('Journal not found'); }
		return res.status(201).json(journalData);
	})
	.catch(function(err) {
		console.error('Error in getPub: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/journal', getJournal);

export function postJournal(req, res, next) {
	// Check if authenticated
	// Make get request
	// Return
	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }


	Journal.create({
		name: req.body.name,
		slug: req.body.slug,
		shortDescription: req.body.shortDescription,
		longDescription: req.body.longDescription,
		reviewDescription: req.body.reviewDescription,
		logo: req.body.logo,
		icon: req.body.icon,
		website: req.body.website,
		twitter: req.body.twitter,
		facebook: req.body.facebook,
	})
	.then(function(newJournal) {
		const createAdmin = JournalAdmin.create({
			userId: user.id,
			journalId: newJournal.id,
		});

		const createFollow = FollowsJournal.create({
			followerId: user.id,
			journalId: newJournal.id
		});
		return Promise.all([createAdmin, createFollow]);
	})
	.then(function() {
		return Journal.findOne({
			where: { slug: req.body.slug, inactive: { $not: true } },
			include: [
				{ model: User, as: 'admins', attributes: userAttributes }, 
				{ model: User, as: 'followers', attributes: userAttributes }, 
			]
		});
	})
	.then(function(journalData) {
		return res.status(201).json(journalData);
	})
	.catch(function(err) {
		console.error('Error in postJournal: ', err);
		return res.status(500).json(err.message);
	});
}
app.post('/journal', postJournal);

export function putJournal(req, res, next) {
	// Used to allow a pub editor to update the pub. 
	// Things like 'distinguishedClone' or fields that are applied by outside users have their own function/authorization check
	
	// Check if authenticated. Update. Return true.

	const user = req.user || {};
	if (!user) { return res.status(500).json('Not authorized'); }

	// Filter to only allow certain fields to be updated
	const updatedJournal = {};
	Object.keys(req.body).map((key)=> {
		if (['slug', 'name', 'shortDescription', 'longDescription', 'reviewDescription', 'logo', 'icon', 'website', 'twitter', 'facebook', 'headerMode', 'headerAlign', 'headerImage'].indexOf(key) > -1) {
			updatedJournal[key] = req.body[key];
		} 
	});

	JournalAdmin.findOne({
		where: { userId: user.id, journalId: req.body.journalId },
		raw: true,
	})
	.then(function(journalAdminData) {
		if (!journalAdminData) {
			throw new Error('Not Authorized to update this journal');
		}
		return Journal.update(updatedJournal, {
			where: { id: req.body.journalId }
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
app.put('/journal', putJournal);

export function deleteJournal(req, res, next) {
	// Used to set the pub to inactive
	
	// Check if authenticated, update, return true.

	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }

	JournalAdmin.findOne({
		where: { userId: user.id, journalId: req.body.journalId },
		raw: true,
	})
	.then(function(journalAdminData) {
		if (!journalAdminData) {
			throw new Error('Not Authorized to update this journal');
		}
		return Journal.update({ inactive: true }, {
			where: { id: req.body.journalId }
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
app.delete('/journal', deleteJournal);
