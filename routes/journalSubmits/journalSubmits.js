// can get all submitted
// Can set isRjected with a put a submission

import app from '../../server';
import { Pub, JournalAdmin, PubSubmit } from '../../models';

export function getSubmits(req, res, next) {
	PubSubmit.findAll({
		where: { journalId: req.query.journalId },
		include: [
			{ model: Pub, as: 'pub' }
		]
	})
	.then(function(journalSubmitsData) {
		return res.status(201).json(journalSubmitsData);
	})
	.catch(function(err) {
		console.error('Error in getSubmits: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/journal/submits', getSubmits);

export function putSubmit(req, res, next) {
	// Enable access to reject a pub submission

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
		return PubSubmit.update({ isRejected: !!req.body.isRejected }, {
			where: { pubId: req.body.pubId, journalId: req.body.journalId }			
		});
	})
	.then(function(countUpdated) {
		return res.status(201).json(countUpdated);
	})
	.catch(function(err) {
		console.error('Error in putSubmit: ', err);
		return res.status(500).json(err.message);
	});
}
app.put('/journal/submits', putSubmit);
