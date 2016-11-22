import app from '../../server';
import { User, FileAttribution, File } from '../../models';

const userAttributes = ['id', 'username', 'firstName', 'lastName', 'image'];

export function getFileAttributions(req, res, next) {
	// Probably should return all labels associated
	// TODO: how do we privelege files? We probably need to assign them to pubs somehow.
	File.findOne({
		where: { id: req.query.fileId },
		include: [
			{ model: User, as: 'attributions', attributes: userAttributes }
		]
	})
	.then(function(fileData) {
		// Filter through to see if contributor, set isAuthorized
		// Filter contributors
		if (!fileData) { return res.status(500).json('FileAttributions not found'); }
		return res.status(201).json(fileData);
	})
	.catch(function(err) {
		console.error('Error in getFileAttributions: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/pub/file/attributions', getFileAttributions);

export function postFileAttribution(req, res, next) {
	FileAttribution.create({
		fileId: req.body.fileId,
		userId: req.body.userId,
	})
	.then(function(newFileAttribution) {
		return res.status(201).json(newFileAttribution);
	})
	.catch(function(err) {
		console.error('Error in postFileAttributions: ', err);
		return res.status(500).json(err.message);
	});
}
app.post('/pub/file/attributions', postFileAttribution);

export function deleteFileAttribution(req, res, next) {
	// This deletes the attribution
	// Authenticate
	FileAttribution.destroy({
		where: { fileId: req.body.fileId, userId: req.body.userId }
	})
	.then(function(destroyedCount) {
		return res.status(201).json(true);
	})
	.catch(function(err) {
		console.error('Error in deleteFileAttributions: ', err);
		return res.status(500).json(err.message);
	});
}
app.delete('/pub/file/attributions', deleteFileAttribution);
