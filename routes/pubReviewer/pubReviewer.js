import app from '../../server';
import { Pub, User, Label, File, Journal, Version, Contributor, FollowsPub, License, InvitedReviewer, Reaction, Role } from '../../models';


export function getReviewer(req, res, next) {
	// Return a single reviewer
}
app.get('/pub/reviewer', getReviewer);

export function postReviewer(req, res, next) {
	// create a new reviewer
	// attach to pub?
	// Return new review object
	
}
app.post('/pub/reviewer', postReviewer);

export function putReviewer(req, res, next) {
	// Authenticate
	// Can set review to accepted/declined
}
app.put('/pub/reviewer', putReviewer);

export function deleteReviewer(req, res, next) {
	// Set review inactive
	// I don't know if this shoud ever be available
}
app.delete('/pub/reviewer', deleteReviewer);
