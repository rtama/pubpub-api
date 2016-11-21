import app from '../../server';
import { Journal, Contributor, PubFeature } from '../../models';

export function getFeatures(req, res, next) {
	PubFeature.findAll({
		where: { pubId: req.query.pubId },
		include: [
			{ model: Journal, as: 'journal' }
		]
	})
	.then(function(pubFeaturesData) {
		return res.status(201).json(pubFeaturesData);
	})
	.catch(function(err) {
		console.error('Error in getFeatures: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/pub/features', getFeatures);

// export function postFeature(req, res, next) {
// 	// Create a new journal submission
// 	// Return new submission object
	
// }
// app.post('/pub/features', postFeature);

export function putFeature(req, res, next) {
	// Is there anything we want to allow to change?
	// whether the journal is featured on the front of the pub?
	// Users with edit access can set the PubFeature value for 'isDisplayed'
	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }

	Contributor.findOne({
		where: { pubId: req.body.pubId, userId: user.id },
		raw: true,
	})
	.then(function(contributor) {
		if (!contributor || (!contributor.canEdit && !contributor.isAuthor)) {
			throw new Error('Not Authorized to edit this pub');
		}
		return PubFeature.update({ isDisplayed: !!req.body.isDisplayed }, {
			where: { pubId: req.body.pubId, journalId: req.body.journalId }			
		});
	})
	.then(function(countUpdated) {
		return res.status(201).json(countUpdated);
	})
	.catch(function(err) {
		console.error('Error in putFeature: ', err);
		return res.status(500).json(err.message);
	});
}
app.put('/pub/features', putFeature);

// export function deleteFeature(req, res, next) {
// 	// Set submission inactive
// }
// app.delete('/pub/features', deleteFeature);
