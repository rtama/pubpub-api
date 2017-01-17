import app from '../../server';
import { FileAttribution } from '../../models';

// TODO: How are file attributions authorizations handled?

export function postFileAttribution(req, res, next) {
	FileAttribution.create({
		fileId: req.body.fileId,
		userId: req.body.userId,
		pubId: req.body.pubId
	})
	.then(function(newFileAttribution) {
		return res.status(201).json(newFileAttribution);
	})
	.catch(function(err) {
		console.error('Error in postFileAttribution: ', err);
		return res.status(500).json(err.message);
	});
}
app.post('/pub/file/attribution', postFileAttribution);

export function deleteFileAttribution(req, res, next) {
	// This deletes the attribution
	// Authenticate
	FileAttribution.destroy({
		where: { fileId: req.body.fileId, userId: req.body.userId, pubId: req.body.pubId },
		individualHooks: true,
	})
	.then(function(destroyedCount) {
		return res.status(201).json(true);
	})
	.catch(function(err) {
		console.error('Error in deleteFileAttribution: ', err);
		return res.status(500).json(err.message);
	});
}
app.delete('/pub/file/attribution', deleteFileAttribution);
