import app from '../../server';
import { Label } from '../../models';

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
app.post('/user/label', postLabel);

export function putLabel(req, res, next) {
	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }

	Label.update({ title: req.body.title }, {
		where: { id: req.body.labelId, userId: user.id },
		individualHooks: true
	})
	.then(function(updatedCount) {
		return res.status(201).json(updatedCount);
	})
	.catch(function(err) {
		console.error('Error in postLabels: ', err);
		return res.status(500).json(err.message);
	});
}
app.put('/user/label', putLabel);

export function deleteLabel(req, res, next) {
	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }

	Label.destroy({
		where: { userId: user.id, id: req.body.labelId },
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
app.delete('/user/label', deleteLabel);
