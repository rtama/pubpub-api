import app from '../../server';
import { Contributor, Label, PubLabel } from '../../models';
import { createActivity } from '../../utilities/createActivity';

export function postPubLabel(req, res, next) {
	// Add a new label to a pub
	// These are already existing labels that we're adding
	// Authenticate. If the label to be applied has the userId of the user making the request, 
	// or if the request is by a pub editor, it is valid.
	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }

	Contributor.findOne({
		where: { pubId: req.body.pubId, userId: user.id },
		raw: true,
	})
	.then(function(contributor) {
		if (!contributor || (!contributor.canEdit && !contributor.isAuthor)) {
			throw new Error('Not Authorized to edit this pub');
		}
		return PubLabel.create({
			pubId: req.body.pubId,
			labelId: req.body.labelId,
		});
	})
	.then(function(newPubLabel) {
		return Label.findOne({
			where: { id: newPubLabel.labelId }
		});
	})
	.then(function(addedLabel) {
		if (addedLabel.journalId === null && addedLabel.pubId === null && addedLabel.userId === null) {
			return [addedLabel, createActivity('newPubLabel', user.id, req.body.labelId, req.body.pubId)];	
		}
		return [addedLabel, {}];
	})
	.spread(function(addedLabel, newActivity) {
		return res.status(201).json(addedLabel);
	})
	.catch(function(err) {
		console.error('Error in postLabels: ', err);
		return res.status(500).json(err.message);
	});
}
app.post('/pub/label', postPubLabel);

export function deletePubLabel(req, res, next) {
	// This deletes the label relationship, not the label itself
	
	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }

	Contributor.findOne({
		where: { pubId: req.body.pubId, userId: user.id },
		raw: true,
	})
	.then(function(contributor) {
		if (!contributor || (!contributor.canEdit && !contributor.isAuthor)) {
			throw new Error('Not Authorized to edit this pub');
		}
		return PubLabel.destroy({
			where: { pubId: req.body.pubId, labelId: req.body.labelId },
			individualHooks: true,
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
app.delete('/pub/label', deletePubLabel);
