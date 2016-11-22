import app from '../../server';
import { Pub, PubReaction, Reaction } from '../../models';

// The singular 'Reaction' doesn't really make sense here. This should perhaps be 'reactions'
export function getReactions(req, res, next) {
	// Return a single reaction
	// Probably should return all reactions associated
	Pub.findOne({
		where: { id: req.query.pubId },
		include: [
			{ model: Reaction, as: 'reactions' },
		]
	})
	.then(function(reactionsData) {
		// Filter through and remove userIds
		if (!reactionsData || !reactionsData.reactions.length) { return res.status(500).json('Reactions not found'); }
		return res.status(201).json(reactionsData.reactions);
	})
	.catch(function(err) {
		console.error('Error in getReactions: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/pub/reactions', getReactions);

export function postReaction(req, res, next) {
	// Add a new reaction to a pub
	// We're not creating reactions, but reaction/pub relationships
	// These are already existing reactions that we're adding
	// Or perhaps just add a new one with a set user
	const user = req.user || {};
	if (!user) { return res.status(500).json('Not authorized'); }

	PubReaction.create({
		pubId: req.body.pubId,
		reactionId: req.body.reactionId,
		userId: user.id,
	})
	.then(function(newPubReaction) {
		return res.status(201).json(newPubReaction);
	})
	.catch(function(err) {
		console.error('Error in postReactions: ', err);
		return res.status(500).json(err.message);
	});

}
app.post('/pub/reactions', postReaction);

export function putReaction(req, res, next) {
	// is there anything we want to let you change?
}
app.put('/pub/reactions', putReaction);

export function deleteReaction(req, res, next) {
	// This deletes the reaction relationship, not the reaction itself
	// Authenticate
	const user = req.user || {};
	if (!user) { return res.status(500).json('Not authorized'); }

	PubReaction.destroy({
		where: { pubId: req.body.pubId, reactionId: req.body.reactionId, userId: user.id }
	})
	.then(function(destroyedCount) {
		return res.status(201).json(true);
	})
	.catch(function(err) {
		console.error('Error in deleteLabels: ', err);
		return res.status(500).json(err.message);
	});
}
app.delete('/pub/reactions', deleteReaction);