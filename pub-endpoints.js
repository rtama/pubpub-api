const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

const Journal = require('./models').Journal;
const User = require('./models').User;
const Atom = require('./models').Atom;
const Link = require('./models').Link;

export function submitPub(req, res, next){
	console.log("pubsIdSubmit")
	const query = { $or:[ {'accessToken': req.body.accessToken}]};
	// const atomArray = JSON.parse(JSON.stringify(req.body.atomIds));
	// const atomId = req.body.atomId;
	const atomID = req.params.id;
	const journalID = req.body.journalID;

	User.findOne(query).lean().exec()
	.then(function(userResult) {

		if (!userResult) {
			throw new Error(ERROR.userNotFound);
		}
		if (!req.body.accessToken || !req.params.id || !req.body.journalID){
			throw new Error(ERROR.missingParam);
		}

		const userID = userResult._id;
		const inactiveNote = 'rejected';
		// Check permission

		// return Link.setLinkInactive('submitted', atomID, journalID, userID, now, inactiveNote)
		// return Link.findOne('submitted', atomId, journalId, userResult._id, now);

		return [Link.findOne({source: atomID, destination: journalID, type: 'submitted', inactive: {$ne: true}}), userID]
	}).spread(function(linkData, userID){
		if (linkData){
			throw new Error('Pub already submitted to Journal');
		}
		const now = new Date().getTime();

		return Link.createLink('submitted', atomID, journalID, userID, now);
	})
	.then(function(){
		return res.status(202).json('Success');
	})
	.catch(function(error){
		return res.status(404).json(error);
	});
}
