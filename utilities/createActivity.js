import { Activity } from '../models';

const activities = {
	followedUser: ['actorUserId', 'targetUserId'],
	followedPub: ['actorUserId', 'targetPubId'],
	followedJournal: ['actorUserId', 'targetJournalId'],
	followedLabel: ['actorUserId', 'targetLabelId'],
	publishedPub: ['actorUserId', 'targetPubId'],
	// 'deletesPub': eh - we would only be notifying you yourself, so this feels less interesting
	forkedPub: ['actorUserId', 'targetPubId'],
	addedContributor: ['actorUserId', 'objectUserId', 'targetPubId'], // Jane(actor) added Steve(object) to Pub(target)
	newVersion: ['actorUserId', 'targetPubId'], // Barry(actor) added a new version to Pub(target)
	newDiscussion: ['actorUserId', 'objectPubId', 'targetPubId'], // Allan(actor) added a new Discussion(object) to Pub (target)
	newReply: ['actorUserId', 'objectPubId', 'targetPubId'], // Allan(actor) replied to a new Discussion(object) on Pub (target)
	newPubLabel: ['actorUserId', 'objectPubId', 'targetLabelId'], // Betsy(actor) added Pub(object) to Physics(target)
	invitedReviewer: ['actorUserId', 'objectUserId', 'targetPubId'], // Sam(actor) invited Darren (object) to Pub(target)
	acceptedReviewInvitation: ['actorUserId', 'objectUserId', 'targetPubId'], // Darren(object) accepted Sam's(actor) invitation to review Pub(target)
	submittedPub: ['actorUserId', 'objectPubId', 'targetJournalId'], // Megan(actor) submitted Pub(object) to Journal (target)
	createdJournal: ['actorUserId', 'targetJournalId'],
	addedAdmin: ['actorUserId', 'objectUserId', 'targetJournalId'], // Steve(actor) added Erin(object) as an admin to Journal(target)
	featuredPub: ['actorJournalId', 'targetPubId'], // Journal of Physics(actor) featured Pub (target)
	createdJournalLabel: ['actorJournalId', 'targetLabelId'], // Journal of Physics(actor) created a new collection, Label(target)
};

export function createActivity(verb, actorId, targetId, objectId) {
	// For a given verb, validate that it is accepted and create the activity.
	console.log(verb, actorId, targetId, objectId);
	if (verb in activities === false) { throw new Error('Invalid Verb'); }
	const verbKeys = activities[verb];
	
	const newActivity = {
		verb: verb,
		[verbKeys[0]]: actorId,
		[verbKeys[verbKeys.length - 1]]: targetId,
	};
	// If the activity requires three keys, then it must require the objectId, so add that to newActivity
	if (verbKeys.length === 3) { 
		console.log('in verbkeys.length');
		console.log(verbKeys[1], objectId);
		newActivity[verbKeys[1]] = objectId; 
	}

	return Activity.create(newActivity);
}
