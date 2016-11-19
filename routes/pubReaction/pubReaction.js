import app from '../../server';
import { Pub, User, Label, File, Label, Version, Contributor, FollowsPub, License, InvitedReviewer, Reaction, Role } from '../../models';

// The singular 'Reaction' doesn't really make sense here. This should perhaps be 'reactions'
export function getReaction(req, res, next) {
	// Return a single reaction
	// Probably should return all reactions associated
}
app.get('/pub/reaction', getReaction);

export function postReaction(req, res, next) {
	// Add a new reaction to a pub
	// We're not creating reactions, on reaction/pub relationships
	// These are already existing reactions that we're adding
	// Or perhaps just add a new one with a set user
}
app.post('/pub/reaction', postReaction);

export function putReaction(req, res, next) {
	// is there anything we want to let you change?
}
app.put('/pub/reaction', putReaction);

export function deleteReaction(req, res, next) {
	// This deletes the reaction relationship, not the reaction itself
}
app.delete('/pub/reaction', deleteReaction);
