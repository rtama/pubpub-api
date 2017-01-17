import app from '../../server';
import { Journal, Contributor, PubFeature } from '../../models';

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

		const updatedFeature = {};
		Object.keys(req.body).map((key)=> {
			if (['isDisplayed'].indexOf(key) > -1) {
				updatedFeature[key] = req.body[key];
			} 
		});

		return PubFeature.update(updatedFeature, {
			where: { pubId: req.body.pubId, journalId: req.body.journalId },
			individualHooks: true			
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
app.put('/pub/feature', putFeature);
