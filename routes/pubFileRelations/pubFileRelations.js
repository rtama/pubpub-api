import app from '../../server';
import { Pub, FileRelation, File } from '../../models';

export function getFileRelations(req, res, next) {
	// Probably should return all labels associated
	// TODO: how do we privelege files? We probably need to assign them to pubs somehow.
	File.findOne({
		where: { id: req.query.fileId },
		include: [
			{ model: File, as: 'sources' }, 
			{ model: File, as: 'destinations' }
		]
	})
	.then(function(fileData) {
		// Filter through to see if contributor, set isAuthorized
		// Filter contributors
		if (!fileData) { return res.status(500).json('FileRelations not found'); }
		return res.status(201).json(fileData);
	})
	.catch(function(err) {
		console.error('Error in getFileRelations: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/pub/file/relations', getFileRelations);

export function postFileRelation(req, res, next) {
	// Add a new label to a pub
	// These are already existing labels that we're adding
	// Authenticate. If the label to be applied has the userId of the user making the request, 
	// or if the request is by a pub editor, it is valid.
	FileRelation.create({
		type: req.body.type,
		sourceFileId: req.body.sourceFileId,
		destinationFileId: req.body.destinationFileId,
		pubId: req.body.pubId,
	})
	.then(function(newFileRelation) {
		return res.status(201).json(newFileRelation);
	})
	.catch(function(err) {
		console.error('Error in postFileRelations: ', err);
		return res.status(500).json(err.message);
	});
}
app.post('/pub/file/relations', postFileRelation);

export function deleteFileRelation(req, res, next) {
	// This deletes the label relationship, not the label itself
	// Authenticate
	FileRelation.destroy({
		where: { sourceFileId: req.body.sourceFileId, destinationFileId: req.body.destinationFileId, pubId: req.body.pubId, },
		individualHooks: true,
	})
	.then(function(destroyedCount) {
		return res.status(201).json(true);
	})
	.catch(function(err) {
		console.error('Error in deleteFileRelations: ', err);
		return res.status(500).json(err.message);
	});
}
app.delete('/pub/file/relations', deleteFileRelation);
