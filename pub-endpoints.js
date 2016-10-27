import { NotModified, BadRequest } from './errors';

const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

// const Journal = require('./models').Journal;
const User = require('./models').User;
// const Atom = require('./models').Atom;
const Link = require('./models').Link;

export function submitPub(req, res, next) {
	const query = { $or: [{ accessToken: req.body.accessToken }] };
	// const atomArray = JSON.parse(JSON.stringify(req.body.atomIds));
	// const atomId = req.body.atomId;
	const atomID = req.params.id;
	const journalID = req.body.journalID;

	User.findOne(query, { _id: 1 }).lean().exec()
	.then((userResult) => {
		if (!userResult) {
			throw new BadRequest();
		}
		if (!req.body.accessToken || !req.params.id || !req.body.journalID) {
			throw new BadRequest();
		}

		const userID = userResult._id;
		// const inactiveNote = 'rejected';
		// Check permission

		// return Link.setLinkInactive('submitted', atomID, journalID, userID, now, inactiveNote)
		// return Link.findOne('submitted', atomId, journalId, userResult._id, now);

		return [Link.findOne({ source: atomID, destination: journalID, type: 'submitted', inactive: { $ne: true } }), userID];
	})
	.spread((linkData, userID) => {
		if (linkData) {
			throw new NotModified();
		}
		const now = new Date().getTime();

		return Link.createLink('submitted', atomID, journalID, userID, now);
	})
	.then(() => {
		return res.status(200).json('Success');
	})
	.catch((error) => {
		return res.status(error.status).json(error.message);
	});
}
