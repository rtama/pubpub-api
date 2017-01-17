import app from '../../server';
import { User, JournalAdmin } from '../../models';
import { createActivity } from '../../utilities/createActivity';
import { userAttributes } from '../user/user';

export function postJournalAdmin(req, res, next) {
	// Authenticate user. Make sure they have edit permissions on the given pub.
	// Add a single contributor
	// Add a new contributor

	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }

	JournalAdmin.findOne({
		where: { journalId: req.body.journalId, userId: user.id },
		raw: true,
	})
	.then(function(journalAdmin) {
		if (!journalAdmin) {
			throw new Error('Not Authorized to edit this journal');
		}
		return JournalAdmin.create({
			userId: req.body.userId,
			journalId: req.body.journalId,
		});
	})
	.then(function(newJournalAdmin) {
		return JournalAdmin.findOne({
			where: { id: newJournalAdmin.id },
			include: [
				{ model: User, as: 'user', attributes: userAttributes }
			]
		});
	})
	.then(function(newJournalAdminData) {
		return [newJournalAdminData, createActivity('addedAdmin', user.id, req.body.journalId, req.body.userId)];
	})
	.spread(function(newJournalAdminData, newActivity) {
		return res.status(201).json(newJournalAdminData);
	})
	.catch(function(err) {
		console.error('Error in postJournalAdmins: ', err);
		return res.status(500).json(err.message);
	});
}
app.post('/journal/admin', postJournalAdmin);

export function deleteJournalAdmin(req, res, next) {
	// Check if authenticated. Remove. Return true.
	
	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }


	JournalAdmin.findOne({
		where: { journalId: req.body.journalId, userId: user.id },
		raw: true,
	})
	.then(function(journalAdmin) {
		if (!journalAdmin) {
			throw new Error('Not Authorized to edit this journal');
		}
		return JournalAdmin.destroy({
			where: { id: req.body.journalAdminId },
			individualHooks: true,
		});
	})
	.then(function(removedCount) {
		return res.status(201).json(true);
	})
	.catch(function(err) {
		console.error('Error in putUser: ', err);
		return res.status(500).json(err.message);
	});
}
app.delete('/journal/admin', deleteJournalAdmin);
