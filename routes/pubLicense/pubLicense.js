import app from '../../server';
import { Pub, User, Label, File, Label, Version, Contributor, FollowsPub, License, InvitedReviewer, Role } from '../../models';

export function getLicense(req, res, next) {
	// Return the license associated with a given pub
}
app.get('/pub/license', getLicense);

export function putLicense(req, res, next) {
	// Change the license associated with a pub
}
app.put('/pub/license', putLicense);
