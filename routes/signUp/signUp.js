import app from '../../server';
import { sequelize, SignUp } from '../../models';
import { generateHash } from '../../utilities/generateHash';

export function getSignUp(req, res, next) {
	SignUp.findOne({ 
		where: { hash: req.query.hash, completed: false },
		attributes: ['email', 'hash'] 
	})
	.then(function(signUpData) {
		if (!signUpData) { return res.status(500).json('Hash not valid'); }
		return res.status(201).json(signUpData);
	})
	.catch(function(err) {
		console.error('Error in get signUp: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/signup', getSignUp);

export function postSignUp(req, res, next) {
	// First, try to update the emailSentCount.
	// If there are no records to update, then we create a new one.
	// If this fails, it is because the email must be unique and it is already used
	SignUp.update({ count: sequelize.literal('count + 1') }, {
		where: { email: req.body.email, completed: false },
		individualHooks: true, // necessary for afterUpdate hook to fire.
	})
	.then(function(updateCount) {
		if (updateCount[0]) { return updateCount[0]; }
		return SignUp.create({
			email: req.body.email,
			hash: generateHash(),
			count: 1,
			completed: false,
		});
	})
	.then(function(result) {
		return res.status(201).json(true);
	})
	.catch(function(err) {
		console.error('Error in post signUp: ', err);
		return res.status(500).json('Email already used');
	});
}
app.post('/signup', postSignUp);
