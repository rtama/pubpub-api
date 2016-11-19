import app from '../../server';
import { Pub, User, Label, File, Journal, Version, Contributor, FollowsPub, License, InvitedReviewer, Reaction, Role } from '../../models';


export function getContributor(req, res, next) {
	// Return the contributor? 
	// Not sure how often this would be used
}
app.get('/pub/contributor', getContributor);

export function postContributor(req, res, next) {
	// Add a new contributor
	// Connect to user
	// Connect to pub
}
app.post('/pub/contributor', postContributor);

export function putContributor(req, res, next) {
	// Update the contributor
	// return true
}
app.put('/pub/contributor', putContributor);

export function deleteContributor(req, res, next) {
	// set contributor to inactive - or, delete?
}
app.delete('/pub/contributor', deleteContributor);
