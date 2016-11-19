import app from '../../server';
import { Pub, User, Label, File, Journal, Version, Contributor, FollowsPub, License, InvitedReviewer, Reaction, Role } from '../../models';


export function getVersion(req, res, next) {
	// Return a single version
	// Authenticate
}
app.get('/pub/version', getVersion);

export function postVersion(req, res, next) {
	// authenticate
	// create new version
	// attach version to pub
	// attach files to new version
	// add any new files that are necessary
}
app.post('/pub/version', postVersion);

export function putVersion(req, res, next) {
	// You can set a version to be public
	// Are there any other things you can change about a version?
}
app.put('/pub/version', putVersion);

export function deleteVersion(req, res, next) {
	// Set version inactive
	// I don't know if this shoud ever be available
}
app.delete('/pub/version', deleteVersion);
