import app from '../../server';
import { JournalAdmin, Label } from '../../models';

export function getLabels(req, res, next) {
	// Probably should return all labels associated to journal
	// Do we populate pubs associated with those labels?
	Label.findAll({
		where: { journalId: req.query.journalId },
	})
	.then(function(labelsData) {
		if (!labelsData) { return res.status(500).json('Labels not found'); }
		return res.status(201).json(labelsData);
	})
	.catch(function(err) {
		console.error('Error in getLabels: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/journal/labels', getLabels);

export function postLabel(req, res, next) {
	// Authenticate
	// Add a new journal-owned label
	
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
		return Label.create({
			journalId: req.body.journalId,
			title: req.body.title,
		});
	})
	.then(function(newLabel) {
		return res.status(201).json(newLabel);
	})
	.catch(function(err) {
		console.error('Error in postLabels: ', err);
		return res.status(500).json(err.message);
	});
}
app.post('/journal/labels', postLabel);

export function putLabel(req, res, next) {
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
		return Label.update({ title: req.body.title }, {
			where: { id: req.body.labelId, journalId: req.body.journalId }
		});
	})
	.then(function(updatedCount) {
		return res.status(201).json(updatedCount);
	})
	.catch(function(err) {
		console.error('Error in postLabels: ', err);
		return res.status(500).json(err.message);
	});
}
app.put('/journal/labels', putLabel);

export function deleteLabel(req, res, next) {
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
		Label.destroy({
			where: { journalId: req.body.journalId, id: req.body.labelId }
		});
	})
	.then(function(destroyedCount) {
		return res.status(201).json(true);
	})
	.catch(function(err) {
		console.error('Error in deleteLabels: ', err);
		return res.status(500).json(err.message);
	});
}
app.delete('/journal/labels', deleteLabel);
