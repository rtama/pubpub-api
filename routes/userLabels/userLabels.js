import app from '../../server';
import { Label } from '../../models';

export function getLabels(req, res, next) {
	// Probably should return all labels associated to journal
	// Do we populate pubs associated with those labels?

	Label.findAll({
		where: { userId: req.query.userId },
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
app.get('/user/labels', getLabels);

export function postLabel(req, res, next) {
	// Authenticate
	// Add a new journal-owned label
	
	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }

	Label.create({
		userId: user.id,
		title: req.body.title
	})
	.then(function(newLabel) {
		return res.status(201).json(newLabel);
	})
	.catch(function(err) {
		console.error('Error in postLabels: ', err);
		return res.status(500).json(err.message);
	});
}
app.post('/user/labels', postLabel);

export function putLabel(req, res, next) {
	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }

	Label.update({ title: req.body.title }, {
		where: { id: req.body.labelId, userId: user.id }
	})
	.then(function(updatedCount) {
		return res.status(201).json(updatedCount);
	})
	.catch(function(err) {
		console.error('Error in postLabels: ', err);
		return res.status(500).json(err.message);
	});
}
app.put('/user/labels', putLabel);

export function deleteLabel(req, res, next) {
	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }

	Label.destroy({
		where: { userId: user.id, id: req.body.labelId }
	})
	.then(function(destroyedCount) {
		return res.status(201).json(true);
	})
	.catch(function(err) {
		console.error('Error in deleteLabels: ', err);
		return res.status(500).json(err.message);
	});
}
app.delete('/user/labels', deleteLabel);
