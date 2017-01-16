import app from '../../server';
import { Label, PubLabel, JournalAdmin, Journal } from '../../models';

// These labels are to allow journal admins to apply labels (collections) to specific pubs. 
// It is similar to the pubLabels routes, but scoped to the journal's labels (collections).
export function getLabels(req, res, next) {
	Journal.findOne({
		where: { id: req.query.journalId },
		include: [
			{ model: Label, as: 'collections' }, // These are labels owned by the journal
		]
	})
	.then(function(labelsData) {
		if (!labelsData || !labelsData.collections.length) { return res.status(500).json('Labels not found'); }
		return res.status(201).json(labelsData.collections);
	})
	.catch(function(err) {
		console.error('Error in getLabels: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/journal/labels', getLabels);

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
app.post('/journal/labels', postLabel);


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
app.delete('/journal/labels', deleteLabel);
