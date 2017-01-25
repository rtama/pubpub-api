import app from '../../server';
import { Highlight } from '../../models';

export function postHighlight(req, res, next) {
	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }

	Highlight.create({
		userId: user.id,
		pubId: req.body.pubId,
		versionId: req.body.versionId,
		versionHash: req.body.versionHash,
		fileId: req.body.fileId,
		fileHash: req.body.fileHash,
		fileName: req.body.fileName,
		prefix: req.body.prefix,
		exact: req.body.exact,
		suffix: req.body.suffix,
		context: req.body.context,
	})
	.then(function(newHighlight) {
		return res.status(201).json(newHighlight);
	})
	.catch(function(err) {
		console.error('Error in postHighlight: ', err);
		return res.status(500).json(err.message);
	});
}
app.post('/highlight', postHighlight);

export function deleteHighlight(req, res, next) {
	const user = req.user || {};
	if (!user) { return res.status(500).json('Not authorized'); }

	Highlight.destroy({
		where: { userId: user.id, id: req.body.highlightId },
		individualHooks: true
	})
	.then(function(destroyedCount) {
		return res.status(201).json(true);
	})
	.catch(function(err) {
		console.error('Error in deleteHighlight: ', err);
		return res.status(500).json(err.message);
	});
}
app.delete('/highlight', deleteHighlight);
