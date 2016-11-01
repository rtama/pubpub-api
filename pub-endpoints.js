import { NotModified, BadRequest } from './errors';

const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

// const Journal = require('./models').Journal;
const User = require('./models').User;
// const Atom = require('./models').Atom;
const Link = require('./models').Link;

export function submitPub(req, res, next) {
	console.log("Submit Pub:" + JSON.stringify(req.user))
	// const query = { $or: [{ _id: req.user ? req.user._id : -1 }] };
	const atomID = req.params.id;
	const journalID = req.body.journalID;
	const userID = req.user ? req.user._id : undefined;
	const user = req.user;

	// User.findOne(query, { _id: 1 }).lean().exec()
	// .then((userResult) => {
	if (!mongoose.Types.ObjectId.isValid(journalID)){
		let error = new BadRequest();
		return res.status(error.status).json(error.message);
	}

	Link.findOne({ source: atomID, destination: journalID, type: 'submitted', inactive: { $ne: true } })
	.then((linkData) => {
		console.log("Did we get a user tho " + user)
		if (!user) {
			throw new BadRequest();
		}
		if (!req.params.id || !req.body.journalID ) {
			throw new BadRequest();
		}

		const userID = user._id;
		// const inactiveNote = 'rejected';
		// Check permission

		// return Link.setLinkInactive('submitted', atomID, journalID, userID, now, inactiveNote)
		// return Link.findOne('submitted', atomId, journalId, user._id, now);
		console.log("getting Linkdata ")

	})
	.then((linkData) => {
		console.log("got Linkdata "  + linkData)
		if (linkData) {
			throw new NotModified();
		}
		const now = new Date().getTime();
		try {
			return Link.createLink('submitted', atomID, journalID, userID, now);
		}
		catch(err) {
			throw new BadRequest();

		}
	})
	.then(() => {
		return res.status(200).json('Success');
	})
	.catch((error) => {
		console.log("Aaah222h eee " + error)

		return res.status(error.status).json(error.message);
	});
}
