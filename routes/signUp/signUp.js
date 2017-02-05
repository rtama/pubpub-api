import app from '../../server';
import { sequelize, SignUp, User } from '../../models';
import { generateHash } from '../../utilities/generateHash';

export function generateSignUp(email) {
	// First, try to update the emailSentCount.
	// If there are no records to update, then we create a new one.
	// If this fails, it is because the email must be unique and it is already used
	return User.findOne({
		where: { email: email }
	})
	.then(function(userData) {
		if (userData) { throw new Error('Email already used'); }

		return SignUp.update({ count: sequelize.literal('count + 1') }, {
			where: { email: email, completed: false },
			individualHooks: true, // necessary for afterUpdate hook to fire.
		});
	})
	.then(function(updateCount) {
		if (updateCount[0]) { 
			return SignUp.findOne({ where: { email: email } }); 
		}
		return SignUp.create({
			email: email,
			hash: generateHash(),
			count: 1,
			completed: false,
		});
	});
}

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
	
	generateSignUp(req.body.email)
	.then(function(result) {
		return res.status(201).json(true);
	})
	.catch(function(err) {
		console.error('Error in post signUp: ', err);
		return res.status(500).json('Email already used');
	});
}
app.post('/signup', postSignUp);

