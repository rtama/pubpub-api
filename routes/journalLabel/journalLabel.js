import app from '../../server';
import { Label, PubLabel, JournalAdmin, Journal } from '../../models';


export function postLabel(req, res, next) {
	// Add a new journal-owned label (page) to a pub
	// These are already existing labels that we're adding
	// Authenticate. If the label to be applied has the journalId in which the user is an admin of.
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
		return Label.findOne({
			where: { id: req.body.labelId, journalId: req.body.journalId }
		});
	})
	.then(function(labelData) {
		if (!labelData) {
			throw new Error('Label not owned by journal');
		}
		return PubLabel.create({
			pubId: req.body.pubId,
			labelId: req.body.labelId,
			journalId: req.body.journalId,
		});
	})
	.then(function(newPubLabel) {
		return Label.findOne({
			where: { id: newPubLabel.labelId }
		});
	})
	.then(function(addedLabel) {
		return res.status(201).json(addedLabel);
	})
	.catch(function(err) {
		console.error('Error in postLabels: ', err);
		return res.status(500).json(err.message);
	});
}
app.post('/journal/label', postLabel);


export function deleteLabel(req, res, next) {
	// This deletes the label relationship, not the label itself
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
		return PubLabel.destroy({
			where: { pubId: req.body.pubId, labelId: req.body.labelId, journalId: req.body.journalId },
			individualHooks: true
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
app.delete('/journal/label', deleteLabel);
