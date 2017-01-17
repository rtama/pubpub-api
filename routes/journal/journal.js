import Promise from 'bluebird';
import app from '../../server';
import { redisClient, Pub, PubSubmit, PubFeature, User, Label, JournalAdmin, Journal, FollowsJournal, InvitedReviewer } from '../../models';
import { createActivity } from '../../utilities/createActivity';
import { userAttributes } from '../user/user';

export function queryForJournal(value) {
	const where = isNaN(value) 
		? { slug: value, inactive: { $not: true } }
		: { id: value, inactive: { $not: true } };
	return Journal.findOne({
		where: where,
		include: [
			{ model: JournalAdmin, as: 'admins', include: [{ model: User, as: 'user', attributes: userAttributes }] }, // Filter to remove hidden if not authorized
			{ model: User, as: 'followers', attributes: userAttributes }, 
			{ model: Label, as: 'collections' }, // These are labels owned by the journal
			{ model: PubSubmit, as: 'pubSubmits', include: [{ model: Pub, as: 'pub' }] },
			{ model: PubFeature, as: 'pubFeatures', include: [{ model: Pub, as: 'pub', include: [{ model: Label, as: 'labels', through: { attributes: [] } }] }] },
			{ model: InvitedReviewer, as: 'invitationsCreated', attributes: ['name', 'pubId', 'invitedUserId', 'inviterUserId', 'inviterJournalId'], include: [{ model: User, as: 'invitedUser', attributes: userAttributes }, { model: User, as: 'inviterUser', attributes: userAttributes }] },
		]
		// include: [{ all: true }]
	});
}

export function getJournal(req, res, next) {
	const user = req.user || {};
	const slug = req.query.slug;

	console.time('journalQueryTime');
	redisClient.getAsync('j_' + slug).then(function(redisResult) {
		if (redisResult) { return redisResult; }
		return queryForJournal(slug);
	})
	.then(function(journalData) {
		if (!journalData) { throw new Error('Journal not Found'); }
		const outputData = journalData.toJSON ? journalData.toJSON() : JSON.parse(journalData);
		console.log('Using Cache: ', !journalData.toJSON);
		const setCache = journalData.toJSON ? redisClient.setexAsync('j_' + slug, 120, JSON.stringify(outputData)) : {};
		return Promise.all([outputData, setCache]);
	})
	.spread(function(journalData, setCacheResult) {
		// Filter through to see if admin, set isAuthorized
		if (!journalData) { return res.status(500).json('Journal not found'); }
		console.timeEnd('journalQueryTime');
		return res.status(201).json(journalData);
	})
	.catch(function(err) {
		console.error('Error in getJournal: ', err);
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
		title: req.body.title,
		slug: req.body.slug,
		description: req.body.description,
		about: req.body.about,
		logo: req.body.logo,
		avatar: req.body.avatar,
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
				{ model: JournalAdmin, as: 'admins', include: [{ model: User, as: 'user', attributes: userAttributes }] },
				{ model: User, as: 'followers', attributes: userAttributes }, 
			]
		});
	})
	.then(function(journalData) {
		return [journalData, createActivity('createdJournal', user.id, journalData.id)];
	})
	.spread(function(journalData, newActivity) {
		return res.status(201).json(journalData);
	})
	.catch(function(err) {
		console.error('Error in postJournal: ', err);
		// const errorSimple = err.message || '';
		const errorsArray = err.errors || [];
		const errorSpecific = errorsArray[0] || {};

		if (errorSpecific.message === 'slug must be unique') { return res.status(500).json('Slug already used'); }
		return res.status(500).json(err.message);
	});
}
app.post('/journal', postJournal);

export function putJournal(req, res, next) {
	// Used to allow a pub editor to update the pub. 
	// Things like 'distinguishedClone' or fields that are applied by outside users have their own function/authorization check
	
	// Check if authenticated. Update. Return true.

	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }

	// Filter to only allow certain fields to be updated
	const updatedJournal = {};
	Object.keys(req.body).map((key)=> {
		if (['slug', 'title', 'description', 'about', 'logo', 'avatar', 'website', 'twitter', 'facebook', 'headerColor', 'headerMode', 'headerAlign', 'headerImage'].indexOf(key) > -1) {
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
			where: { id: req.body.journalId },
			individualHooks: true,
		});
	})
	.then(function(updatedCount) {
		return res.status(201).json(true);
	})
	.catch(function(err) {
		console.error('Error in putJournal: ', err);
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
			where: { id: req.body.journalId },
			individualHooks: true,
		});
	})
	.then(function(updatedCount) {
		return res.status(201).json(true);
	})
	.catch(function(err) {
		console.error('Error in deleteJournal: ', err);
		return res.status(500).json(err.message);
	});
}
app.delete('/journal', deleteJournal);
