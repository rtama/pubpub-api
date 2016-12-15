import Promise from 'bluebird';
import request from 'request-promise';
import app from '../../server';
import { User, Version, File, FileRelation, FileAttribution, Contributor, VersionFile, PubVersion } from '../../models';

const userAttributes = ['id', 'username', 'firstName', 'lastName', 'image', 'bio'];

export function getVersions(req, res, next) {
	// Return a single version
	// Authenticate that the version is allowed
	// return version with files, etc

	const user = req.user || {};

	Contributor.findOne({
		where: { userId: user.id, pubId: req.query.pubId },
		raw: true,
	})
	.then(function(contributorData) {
		const canEdit = contributorData && (contributorData.canEdit || contributorData.isAuthor);

		const whereQuery = canEdit 
			? { id: req.query.versionId }
			: { id: req.query.versionId, isPublished: true };
		return Version.findOne({
			where: whereQuery,
			include: [
				{ model: File, as: 'files', include: [{ model: File, as: 'sources' }, { model: File, as: 'destinations' }, { model: User, as: 'attributions', attributes: userAttributes }] }
			]
		});
	})
	.then(function(versionData) {
		if (!versionData) {
			throw new Error('Version not found'); 
		}
		return res.status(201).json(versionData);
	})
	.catch(function(err) {
		console.error('Error in getContributors: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/pub/versions', getVersions);

export function postVersion(req, res, next) {
	// Authenticating here is a bit tricky.
	// Files don't necessarily have their own permissions
	// There is nothing to stop someone from guessing a fileId and having that included in their document
	// Even if that fileId is part of a private pub, we haven't checked for that yet.

	// authenticate
	// What happens if you clone a file, we just duplicate the pointer, but are you then
	// allowed to update it's attributions?
	// Check that all parameters that need to exist do.

	// We should be hashing the content of files here. We should also be verifying the 'existing' files that are uploaded
	// By confirming their hashes with the hash in the db.
	// If somebody has a file with the wrong id, it will not throw any errors at the moment
	// and will instead associate the wrong (potentially unpublished) file to the version.

	// create an object with key=filename, value=id
	// Can have undefined values to start, upload files, complete object
	// Use object to build attributions, relations, etc
	// Maybe explcitly get all the files associated with the version, so that we can't unathenticated attributions, 






	const files = req.body.files || [];
	const oldFiles = files.filter((file)=> {
		return file.id !== undefined;
	});
	const newFiles = files.filter((file)=> {
		return file.id === undefined;
	});
	
	// Parse contents from files if necessary
	const readFilePromises = newFiles.map((file)=> {
		if (file.type === 'text/markdown') { return request(file.url); }
		return null;
	});

	let newVersionId;

	Promise.all(readFilePromises)
	.then(function(contents) {
		const newFilesWithContent = newFiles.map((file, index)=> {
			return { ...file, content: contents[index] };
		});

		const createFiles = File.bulkCreate(newFilesWithContent, { returning: true });
		const createVersion = Version.create({
			versionMessage: req.body.versionMessage,
			isPublished: !!req.body.isPublished,

		});
		return Promise.all([createFiles, createVersion]);
	})
	.spread(function(addedFiles, addedVersion) {
		newVersionId = addedVersion.id;
		const newVersionFileEntries = [...oldFiles, ...addedFiles].map((file)=> {
			return { versionId: newVersionId, fileId: file.id || file.dataValues.id };
		});
		const createVersionFiles = VersionFile.bulkCreate(newVersionFileEntries);
		const createPubVersion = PubVersion.create({ pubId: req.body.pubId, versionId: newVersionId });
		return Promise.all([createVersionFiles, createPubVersion]);
	})
	.spread(function(newVersionFiles, newPubVersion) {
		// Find the files for this given version
		return Version.findOne({
			where: { id: newVersionId },
			include: [{ model: File, as: 'files' }],
		});
	})
	.then(function(versionData) { 
		const nameIdObject = {};
		const versionDataFiles = versionData.dataValues.files || [];
		versionDataFiles.map((file)=> {
			nameIdObject[file.name] = file.id;
		});

		const newFileRelationsInput = req.body.newFileRelations || [];
		const newFileRelations = newFileRelationsInput.map((newRelation)=> {
			return { sourceFileId: nameIdObject[newRelation.source], destinationFileId: nameIdObject[newRelation.destination] };
		});
		const newFileAttributionsInput = req.body.newFileAttributions || [];
		const newFileAttributions = newFileAttributionsInput.map((newAttribution)=> {
			return { fileId: nameIdObject[newAttribution.fileName], userId: newAttribution.userId };
		});

		const createFileRelations = FileRelation.bulkCreate(newFileRelations);
		const createFileAttributions = FileAttribution.bulkCreate(newFileAttributions);
		return Promise.all([createFileRelations, createFileAttributions]);
	})
	.spread(function(newFileRelations, newFileAttributions) {
		return Version.findOne({
			where: { id: newVersionId },
			include: [
				{ model: File, as: 'files', include: [{ model: File, as: 'sources' }, { model: File, as: 'destinations' }, { model: User, as: 'attributions', attributes: userAttributes }] }
			]
		});
	})
	.then(function(newVersion) {
		return res.status(201).json(newVersion);
	})
	.catch(function(err) {
		console.error('Error in postVersion: ', err);
		return res.status(500).json(err.message);
	});

	// Make files
	// Make version
	// Attach files to version (create VersionFiles records)
	// Attach version to pub (create PubVersion entry)
	// Get files based on version
	// build name:id object
	// Build FileRelations entries
	// Build Attributions entries


	// create new version
	// attach version to pub
	// attach files to new version
	// add any new files that are necessary
	// If files have relations, have to make those too
	// If files have attributions, have to make those too 
	//
	// Perhaps the files list that is sent up has a list of fileIDs, and then files.
	// If the item is a typeof(number) then we just add, otherwise we add files in bulk
	// Do we also hash each file to check if it already exists in the DB?

}
app.post('/pub/versions', postVersion);

export function putVersion(req, res, next) {
	// Authenticate
	// Set version to public
	// Return true
	// TODO: need to validate that the versionId supplied is actually a part of the pubId supplied
	const user = req.user || {};

	Contributor.findOne({
		where: { userId: user.id, pubId: req.body.pubId },
		raw: true,
	})
	.then(function(contributorData) {
		const canEdit = contributorData && (contributorData.canEdit || contributorData.isAuthor);

		if (!canEdit) {
			throw new Error('Not Authorized to update this version');
		}
		return Version.update({ isPublished: true }, {
			where: { id: req.body.versionId }
		});
	})
	.then(function(updatedCount) {
		return res.status(201).json(true);
	})
	.catch(function(err) {
		console.error('Error in getContributors: ', err);
		return res.status(500).json(err.message);
	});

}
app.put('/pub/versions', putVersion);
