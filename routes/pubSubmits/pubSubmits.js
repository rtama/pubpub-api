import app from '../../server';
import { Journal, Contributor, PubSubmit } from '../../models';
import { createActivity } from '../../utilities/createActivity';


export function getSubmits(req, res, next) {
	PubSubmit.findAll({
		where: { pubId: req.query.pubId },
		include: [
			{ model: Journal, as: 'journal' }
		]
	})
	.then(function(pubSubmitsData) {
		return res.status(201).json(pubSubmitsData);
	})
	.catch(function(err) {
		console.error('Error in getSubmits: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/pub/submits', getSubmits);

export function postSubmit(req, res, next) {
	// Create a new journal submission
	// Return new submission object
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
		return PubSubmit.create({
			pubId: req.body.pubId,
			journalId: req.body.journalId
		});
	})
	.then(function(newPubSubmit) {
		return PubSubmit.findOne({
			where: { pubId: newPubSubmit.pubId, journalId: newPubSubmit.journalId },
			include: [{ model: Journal, as: 'journal' }]
		});
	})
	.then(function(newPubSubmitData) {
		return [newPubSubmitData, createActivity('submittedPub', user.id, req.body.journalId, req.body.pubId)];
	})
	.spread(function(newPubSubmitData, newActivity) {
		return res.status(201).json(newPubSubmitData);
	})
	.catch(function(err) {
		console.error('Error in postSubmit: ', err);
		return res.status(500).json(err.message);
	});
}
app.post('/pub/submits', postSubmit);

// export function putSubmit(req, res, next) {
// 	// Is there anything we want to allow to change?
// 	// whether the journal is featured on the front of the pub?
// 	// Users with edit access can set the PubFeature value for 'isDisplayed'
// }
// app.put('/pub/submits', putSubmit);

// export function deleteSubmit(req, res, next) {
// 	// Set submission inactive
// }
// app.delete('/pub/submits', deleteSubmit);
