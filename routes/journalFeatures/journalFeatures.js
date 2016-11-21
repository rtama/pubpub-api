import app from '../../server';
import { Pub, PubFeature, JournalAdmin } from '../../models';
// can get all featured
// Can create feature

export function getFeatures(req, res, next) {
	PubFeature.findAll({
		where: { journalId: req.query.journalId },
		include: [
			{ model: Pub, as: 'pub' }
		]
	})
	.then(function(journalFeaturesData) {
		return res.status(201).json(journalFeaturesData);
	})
	.catch(function(err) {
		console.error('Error in getJournalFeatures: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/journal/features', getFeatures);

export function postFeatures(req, res, next) {
	// Create a new journal submission
	// Return new submission object
	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }

	JournalAdmin.findOne({
		where: { journalId: req.body.journalId, userId: user.id },
		raw: true,
	})
	.then(function(journalAdmin) {
		if (!journalAdmin) {
			throw new Error('Not Authorized to edit this journal');
		}

		return PubFeature.create({
			pubId: req.body.pubId,
			journalId: req.body.journalId
		});
	})
	.then(function(newPubFeature) {
		return PubFeature.findOne({
			where: { pubId: newPubFeature.pubId, journalId: newPubFeature.journalId },
			include: [{ model: Pub, as: 'pub' }]
		});
	})
	.then(function(newPubFeatureData) {
		return res.status(201).json(newPubFeatureData);
	})
	.catch(function(err) {
		console.error('Error in postJournalFeature: ', err);
		return res.status(500).json(err.message);
	});
}
app.post('/journal/features', postFeatures);
