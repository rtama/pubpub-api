import { NotModified, BadRequest } from './errors';

const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

// const Journal = require('./models').Journal;
// const User = require('./models').User;
// const Atom = require('./models').Atom;
const Link = require('./models').Link;

export function submitPub(req, res, next) {
	// const query = { $or: [{ _id: req.user ? req.user._id : -1 }] };
	const atomID = req.params.id;
	const journalID = req.body.journalID;
	const userID = req.user._id;
	// const user = req.user;

	if (!mongoose.Types.ObjectId.isValid(journalID)) {
		const error = new BadRequest();
		return res.status(error.status).json(error.message);
	}

	Link.findOne({ source: atomID, destination: journalID, type: 'submitted', inactive: { $ne: true } })
	.then((linkData) => {
		if (linkData) {
			throw new NotModified();
		}

		if (!req.params.id || !req.body.journalID) {
			throw new BadRequest();
		}

		const now = new Date().getTime();
		try {
			return Link.createLink('submitted', atomID, journalID, userID, now);
		} catch (err) {
			throw new BadRequest();
		}
	})
	.then(() => res.status(200).json('Success'))
	.catch(error => res.status(error.status).json(error.message));
}
