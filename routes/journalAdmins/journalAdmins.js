import app from '../../server';
import { User, JournalAdmin } from '../../models';

const userAttributes = ['id', 'username', 'firstName', 'lastName', 'image'];

export function getJournalAdmins(req, res, next) {
	// Get user
	// Get all admins
	// Return list
	JournalAdmin.findAll({
		where: { journalId: req.query.journalId },
		include: [
			{ model: User, as: 'user', attributes: userAttributes }
		]
	})
	.then(function(journalAdminsData) {
		if (!journalAdminsData) { return res.status(500).json('JournalAdmins not found'); }
		return res.status(201).json(journalAdminsData);
	})
	.catch(function(err) {
		console.error('Error in getJournalAdmins: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/journal/admins', getJournalAdmins);

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
		return res.status(201).json(newJournalAdminData);
	})
	.catch(function(err) {
		console.error('Error in postJournalAdmins: ', err);
		return res.status(500).json(err.message);
	});
}
app.post('/journal/admins', postJournalAdmin);

// export function putJournalAdmin(req, res, next) {
// 	// Not sure there is anything to put for journal admins at this point
// }
// app.put('/journal/admins', putJournalAdmin);

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
app.delete('/journal/admins', deleteJournalAdmin);
