import app from '../../server';
import { JournalAdmin, PubSubmit } from '../../models';

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
			where: { pubId: req.body.pubId, journalId: req.body.journalId },
			individualHooks: true		
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
app.put('/journal/submit', putSubmit);
