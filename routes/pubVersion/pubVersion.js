import Promise from 'bluebird';
import SHA1 from 'crypto-js/sha1';
import encHex from 'crypto-js/enc-hex';

import app from '../../server';
import { processFile } from '../../utilities/processFile';
import { createActivity } from '../../utilities/createActivity';
import { User, Version, File, FileRelation, FileAttribution, Contributor, VersionFile, Pub } from '../../models';
import { userAttributes } from '../user/user';

export function postVersion(req, res, next) {
	// Authenticate user
	// Authenticate old files
	// Make files
	// Make version
	// Attach files to version (create VersionFiles records)
	// Get files based on version
	// build name:id object
	// Build FileRelations entries
	// Build Attributions entries

	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }
	if (!req.body.versionMessage) { return res.status(500).json('Version Message Required'); }

	// Separate old files (ones already parsed on the PubPub end) from new ones
	const files = req.body.files || [];
	const oldFiles = files.filter((file)=> { return file.id !== undefined; });
	const newFiles = files.filter((file)=> { return file.id === undefined; });

	let newVersionId;

	Contributor.findOne({
		where: { userId: user.id, pubId: req.body.pubId },
		raw: true,
	})
	.then(function(contributorData) {
		if (!contributorData || (!contributorData.canEdit && !contributorData.isAuthor)) {
			throw new Error('Not Authorized to update this pub');
		}

		// Verify old files by checking that id, pubId, hash, and url are valid.
		// This ensures that there are no mistakes about whether a old file already exists as submitted
		// Also prevents someone from submitting an id that they don't own, in a hope to get access to unpublished work.
		const oldFileQueries = oldFiles.map((file)=> {
			return { id: file.id, hash: file.hash, pubId: req.body.pubId, url: file.url };
		});
		return File.findAll({
			where: { $or: oldFileQueries }
		});
		
	})
	.then(function(oldFileResults) {
		// If there are fewer files found than submitted, one of the 'oldFiles' submitted does not actually exist in our system
		if (oldFileResults.length !== oldFiles.length) {
			throw new Error('Invalid existing files submitted');
		}

		const processFilePromises = newFiles.map((file)=> {
			return processFile(file);
		});
		return Promise.all(processFilePromises);
	})
	.then(function(promiseResults) {
		const filesHashes = oldFiles.map((file)=> { return file.hash; });

		const newFilesWithContent = newFiles.map((file, index)=> {
			filesHashes.push(promiseResults[index].hash);
			return { ...file, ...promiseResults[index], pubId: req.body.pubId };
		});

		// To generate the version hash, take the hash of all the files, sort them alphabetically, concatenate them, and then hash that string.
		const fileHashString = filesHashes.sort((foo, bar)=> {
			if (foo > bar) { return 1; }
			if (foo < bar) { return -1; }
			return 0;
		})
		.reduce((previous, current)=> {
			return previous + current;
		}, '');

		const createFiles = File.bulkCreate(newFilesWithContent, { returning: true });
		const createVersion = Version.create({
			versionMessage: req.body.versionMessage,
			isPublished: !!req.body.isPublished,
			hash: SHA1(fileHashString).toString(encHex),
			pubId: req.body.pubId,
			defaultFile: req.body.defaultFile,
		});

		return Promise.all([createVersion, createFiles]);
	})
	.spread(function(addedVersion, addedFiles) {
		newVersionId = addedVersion.id;
		const newVersionFileEntries = [...oldFiles, ...addedFiles].map((file)=> {
			return { versionId: newVersionId, fileId: file.id };
		});
		return VersionFile.bulkCreate(newVersionFileEntries);
	})
	.then(function(newVersionFilesCount) {
		return Version.findOne({
			where: { id: newVersionId },
			include: [{ model: File, as: 'files' }],
		});
	})
	.then(function(versionData) { 
		// Create file attributions and file relations if any exist
		const nameIdObject = {};
		const versionDataFiles = versionData.dataValues.files || [];
		versionDataFiles.map((file)=> {
			nameIdObject[file.name] = file.id;
		});

		const newFileRelationsInput = req.body.newFileRelations || [];
		const newFileRelations = newFileRelationsInput.map((newRelation)=> {
			return { sourceFileId: nameIdObject[newRelation.source], destinationFileId: nameIdObject[newRelation.destination], pubId: req.body.pubId };
		});
		const newFileAttributionsInput = req.body.newFileAttributions || [];
		const newFileAttributions = newFileAttributionsInput.map((newAttribution)=> {
			return { fileId: nameIdObject[newAttribution.fileName], userId: newAttribution.userId, pubId: req.body.pubId };
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
}
app.post('/pub/version', postVersion);

export function putVersion(req, res, next) {
	// Authenticate
	// Set version to public
	// Return true
	// TODO: need to validate that the versionId supplied is actually a part of the pubId supplied
	const user = req.user || {};

	const updatedVersion = {};
	Object.keys(req.body).map((key)=> {
		if (['isPublished', 'isRestricted', 'defaultFile'].indexOf(key) > -1) {
			updatedVersion[key] = req.body[key];
		} 
	});

	Contributor.findOne({
		where: { userId: user.id, pubId: req.body.pubId },
		raw: true,
	})
	.then(function(contributorData) {
		if (!contributorData || (!contributorData.canEdit && !contributorData.isAuthor)) {
			throw new Error('Not Authorized to update this pub');
		}
		return Version.update(updatedVersion, {
			where: { id: req.body.versionId },
			individualHooks: true,
		});
	})
	.then(function(updatedCount) {
		if (req.body.isPublished && updatedCount[0] > 0) { 
			// if isPublished and updatedCount > 0, that means we set isPublished to true.
			// So grab the parent pub to see if we need to update it's isPublished also. 
			// Note, this will generate duplicate isPublished activities, since we're not checking the state of isPublished before calling update
			// And it could be updated because of other values in the body, such as req.body.doi. 
			// So, best practice is to not include the isPublished key if you're not publishing
			return Pub.findOne({
				where: { id: req.body.pubId },
				raw: true
			}).then(function(pubData) {
				if (pubData.isPublished) {
					return createActivity('newVersion', user.id, req.body.pubId);
				}

				return Promise.all([
					createActivity('publishedPub', user.id, req.body.pubId),
					Pub.update({ isPublished: true }, { where: { id: req.body.pubId }, individualHooks: true })
				]);
			});
		}
		if (req.body.isRestricted && updatedCount[0] > 0) { 
			// if isRestricted and updatedCount > 0, that means we set isRestricted to true.
			// So grab the parent pub to see if we need to update it's isRestricted also. 
			return Pub.findOne({
				where: { id: req.body.pubId },
				raw: true
			}).then(function(pubData) {
				if (pubData.isRestricted) { return true; }
				return Pub.update({ isRestricted: true }, { where: { id: req.body.pubId }, individualHooks: true });
			});
		}
		return true;
	})
	.then(function(promiseResults) {
		return res.status(201).json(true);
	})
	.catch(function(err) {
		console.error('Error in getContributors: ', err);
		return res.status(500).json(err.message);
	});

}
app.put('/pub/version', putVersion);
