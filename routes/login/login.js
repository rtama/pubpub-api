import passport from 'passport';
import app from '../../server';
import { User, Pub, Contributor, Journal, JournalAdmin } from '../../models';
import { authenticatedUserAttributes } from '../user/user';

export function login(req, res) {
	const user = req.user;
	if (!user) { return res.status(201).json({}); }

	User.findOne({ 
		where: { id: user.id },
		include: [
			{ model: Contributor, separate: true, as: 'contributions', include: [{ model: Pub, as: 'pub', where: { replyRootPubId: null }, }] },
			{ model: JournalAdmin, as: 'journalAdmins', include: [{ model: Journal, as: 'journal' }] },
		]
	})
	.then(function(userData) {
		const loginData = {};
		const allAttributes = [...authenticatedUserAttributes, 'contributions', 'journalAdmins'];
		for (let index = 0; index < allAttributes.length; index++) {
			const key = allAttributes[index];
			loginData[key] = userData[key];
		}
		return res.status(201).json(loginData);
	})
	.catch(function(err) {
		return res.status(500).json(err);
	});

}
app.get('/login', login);
app.post('/login', passport.authenticate('local'), login);
