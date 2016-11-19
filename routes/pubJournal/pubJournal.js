import app from '../../server';
import { Pub, User, Label, File, Journal, Version, Contributor, FollowsPub, License, InvitedReviewer, Reaction, Role } from '../../models';

// The singular 'Journal' doesn't really make sense here. This should perhaps be 'journalSubmissions'
export function getJournal(req, res, next) {
	// Return a single reviewer
}
app.get('/pub/journal', getJournal);

export function postJournal(req, res, next) {
	// Create a new journal submission
	// Return new submission object
	
}
app.post('/pub/journal', postJournal);

export function putJournal(req, res, next) {
	// Is there anything we want to allow to change?
}
app.put('/pub/journal', putJournal);

export function deleteJournal(req, res, next) {
	// Set submission inactive
}
app.delete('/pub/journal', deleteJournal);
