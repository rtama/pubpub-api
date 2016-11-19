import app from '../../server';
import { Pub, User, Label, File, Journal, Version, Contributor, FollowsPub, License, InvitedReviewer, Reaction, Role } from '../../models';


export function getDiscussion(req, res, next) {
	// Return a single discussion
	// Authenticate
}
app.get('/pub/discussion', getDiscussion);

export function postDiscussion(req, res, next) {
	// authenticate
	// create new pub
	// attach to parent pub
}
app.post('/pub/discussion', postDiscussion);

export function putDiscussion(req, res, next) {
	// You can set a discussion to be closed, change title, etc
	// Return true
}
app.put('/pub/discussion', putDiscussion);

export function deleteDiscussion(req, res, next) {
	// Set discussion inactive
	// I don't know if this shoud ever be available
}
app.delete('/pub/discussion', deleteDiscussion);
