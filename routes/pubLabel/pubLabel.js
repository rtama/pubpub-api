import app from '../../server';
import { Pub, User, Label, File, Label, Version, Contributor, FollowsPub, License, InvitedReviewer, Reaction, Role } from '../../models';

// The singular 'Label' doesn't really make sense here. This should perhaps be 'labels'
export function getLabel(req, res, next) {
	// Return a single label
	// Probably should return all labels associated
}
app.get('/pub/label', getLabel);

export function postLabel(req, res, next) {
	// Add a new label to a pub
	// These are already existing labels that we're adding
}
app.post('/pub/label', postLabel);

export function putLabel(req, res, next) {
	// is there anything we want to let you change?
}
app.put('/pub/label', putLabel);

export function deleteLabel(req, res, next) {
	// This deletes the label relationship, not the label itself
}
app.delete('/pub/label', deleteLabel);
