import app from '../../server';
import { Pub, Label, PubLabel } from '../../models';

export function getLabels(req, res, next) {
	// Probably should return all labels associated
	Pub.findOne({
		where: { id: req.query.pubId },
		include: [
			{ model: Label, as: 'labels', through: { attributes: [] } }, // These are labels applied to the pub
		]
	})
	.then(function(labelsData) {
		// Filter through to see if contributor, set isAuthorized
		// Filter contributors
		if (!labelsData || !labelsData.labels.length) { return res.status(500).json('Labels not found'); }
		return res.status(201).json(labelsData.labels);
	})
	.catch(function(err) {
		console.error('Error in getLabels: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/pub/labels', getLabels);

export function postLabel(req, res, next) {
	// Add a new label to a pub
	// These are already existing labels that we're adding
	// Authenticate. If the label to be applied has the userId of the user making the request, 
	// or if the request is by a pub editor, it is valid.
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
app.post('/pub/labels', postLabel);

export function putLabel(req, res, next) {
	// is there anything we want to let someone change?
}
app.put('/pub/labels', putLabel);

export function deleteLabel(req, res, next) {
	// This deletes the label relationship, not the label itself
	// Authenticate
	PubLabel.destroy({
		where: { pubId: req.body.pubId, labelId: req.body.labelId }
	})
	.then(function(destroyedCount) {
		return res.status(201).json(true);
	})
	.catch(function(err) {
		console.error('Error in deleteLabels: ', err);
		return res.status(500).json(err.message);
	});
}
app.delete('/pub/labels', deleteLabel);
