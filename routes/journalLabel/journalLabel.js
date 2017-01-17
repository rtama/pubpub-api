import app from '../../server';
import { Label, PubLabel, JournalAdmin, Journal } from '../../models';


export function postLabel(req, res, next) {
	// Add a new journal-owned label (collection) to a pub
	// These are already existing labels that we're adding
	// Authenticate. If the label to be applied has the journalId in which the user is an admin of.
	PubLabel.create({
		pubId: req.body.pubId,
		labelId: req.body.labelId,
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
	// Authenticate
	PubLabel.destroy({
		where: { pubId: req.body.pubId, labelId: req.body.labelId },
		individualHooks: true
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
