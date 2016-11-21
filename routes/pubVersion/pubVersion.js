import app from '../../server';
import { Pub, User, Label, File, Journal, Version, Contributor, FollowsPub, License, InvitedReviewer, Reaction, Role } from '../../models';


export function getVersion(req, res, next) {
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
				{ model: File, as: 'files', include: [{ model: File, as: 'sources' }, { model: File, as: 'destinations' }, { model: User, as: 'users' }] }
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
app.get('/pub/version', getVersion);

export function postVersion(req, res, next) {
	// authenticate
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
app.post('/pub/version', postVersion);

export function putVersion(req, res, next) {
	// Authenticate
	// Set version to public
	// Return true

}
app.put('/pub/version', putVersion);
