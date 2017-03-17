import app from '../../server';
import { Journal, JournalAdmin } from '../../models';

export function getJournals(req, res, next) {
	if (!req.query.userId) { return res.status(500).json('userId Required'); }

	JournalAdmin.findAll({ 
		where: { userId: req.query.userId },
		include: [
			{ model: Journal, as: 'journal' }
		] 
	})
	.then(function(journalAdmins) {
		return res.status(201).json(journalAdmins);
	})
	.catch(function(err) {
		console.log(err);
		return res.status(500).json(err);
	});
}
app.get('/user/journals', getJournals);
