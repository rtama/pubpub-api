import { NotModified, BadRequest } from './errors';

const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

// const Journal = require('./models').Journal;
// const User = require('./models').User;
// const Atom = require('./models').Atom;
const Link = require('./models').Link;

export function submitPub(req, res, next) {
	console.log("Submitting Pub from user:" + JSON.stringify(req.user))
	// const query = { $or: [{ _id: req.user ? req.user._id : -1 }] };
	const atomID = req.params.id;
	const journalID = req.body.journalID;
	const userID = req.user._id;
	const user = req.user;

	// User.findOne(query, { _id: 1 }).lean().exec()
	// .then((userResult) => {
	if (!mongoose.Types.ObjectId.isValid(journalID)){
		let error = new BadRequest();
		return res.status(error.status).json(error.message);
	}

	Link.findOne({ source: atomID, destination: journalID, type: 'submitted', inactive: { $ne: true } })
	.then((linkData) => {
		console.log("Does a link exist? " + linkData)
		if (linkData) {
			throw new NotModified();
		}

		if (!req.params.id || !req.body.journalID) {
			throw new BadRequest();
		}

		// const inactiveNote = 'rejected';
		// Check permission

		// return Link.setLinkInactive('submitted', atomID, journalID, userID, now, inactiveNote)
		// return Link.findOne('submitted', atomId, journalId, user._id, now);
	//
	// })
	// .then((linkData) => {
	// 	console.log("got Linkdata "  + linkData)

		const now = new Date().getTime();
		try {
			return Link.createLink('submitted', atomID, journalID, userID, now);
		}
		catch(err) {
			throw new BadRequest();
		}
	})
	.then(() => {
		console.log("Getting success!!")
		return res.status(200).json('Success');
	})
	.catch((error) => {
		console.log("Aaah222h eee " + error)

		return res.status(error.status).json(error.message);
	});
}
