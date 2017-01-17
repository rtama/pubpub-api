import app from '../../server';
import { Pub, PubReaction, Reaction } from '../../models';

export function postReaction(req, res, next) {
	// Add a new reaction to a pub
	// We're not creating reactions, but reaction/pub relationships
	// These are already existing reactions that we're adding
	// Or perhaps just add a new one with a set user
	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }

	PubReaction.create({
		pubId: req.body.pubId,
		replyRootPubId: req.body.replyRootPubId,
		reactionId: req.body.reactionId,
		userId: user.id,
	})
	.then(function(newPubReaction) {
		return PubReaction.findOne({
			where: { 
				userId: newPubReaction.userId,
				pubId: newPubReaction.pubId,
				reactionId: newPubReaction.reactionId,
			},
			include: [
				{ model: Reaction, as: 'reaction' }
			]
		});
	})
	.then(function(pubReactionData) {
		return res.status(201).json(pubReactionData);
	})
	.catch(function(err) {
		console.error('Error in postReactions: ', err);
		return res.status(500).json(err.message);
	});

}
app.post('/pub/reaction', postReaction);

export function deleteReaction(req, res, next) {
	// This deletes the reaction relationship, not the reaction itself
	// Authenticate
	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }

	PubReaction.destroy({
		where: { pubId: req.body.pubId, replyRootPubId: req.body.replyRootPubId, reactionId: req.body.reactionId, userId: user.id },
		individualHooks: true,
	})
	.then(function(destroyedCount) {
		return res.status(201).json(true);
	})
	.catch(function(err) {
		console.error('Error in deleteLabels: ', err);
		return res.status(500).json(err.message);
	});
}
app.delete('/pub/reaction', deleteReaction);
