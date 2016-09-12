if (process.env.NODE_ENV !== 'production') {
	require('./config.js');
}

const osprey = require('osprey');
const express = require('express');
const join = require('path').join;
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const path = join(__dirname, 'api.raml');

const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
mongoose.connect(process.env.MONGO_URI);
const Journal = require('./models').Journal;
const User = require('./models').User;
const Atom = require('./models').Atom;
const Link = require('./models').Link;

import {getFeatured, getCollections, getJournal, getSubmissions} from './journal-endpoints';
import {getUserByID} from './user-endpoints';
import {submitPub} from './pub-endpoints'

const ERROR = {
	missingParam: 'Required parameter missing',
	userNotFound: 'User not found',
	youDoNotHaveAccessToThisJournal: 'You do not have access to this action'
}

osprey.loadFile(path)
.then(function (middleware) {

	app.use(middleware);

	app.all('/*', function(req, res, next) {
		res.header("Access-Control-Allow-Origin", req.headers.origin);
		res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
		res.header("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, OPTIONS");
		res.header("Access-Control-Allow-Credentials", true);
		next();
	});


	app.use(function (err, req, res, next) {
		// Handle errors.
		console.log("Error! " + err + ", " + next)
		next();
	});

	/* Route for         */
	/* /user/{username}  */
	/* /user/{id}        */
	app.get('/user/:id/', getUserByID);

	/* Route for         */
	/* /journal/{slug}   */
	/* /journal/{id}     */
	app.get('/journal/:id/', getJournal);

	/* Route for                 		*/
	/* /journal/{slug}/submissions  */
	/* /journal/{id}/submissions    */
	app.get('/journal/:id/submissions/', getSubmissions);

	/* Route for                 */
	/* /journal/{slug}/featured  */
	/* /journal/{id}/featured    */
	app.get('/journal/:id/featured/', getFeatured);

	/* Route for                 */
	/* /journal/{slug}/feature  */
	/* /journal/{id}/feature    */
	app.post('/journal/:id/feature/', function (req, res, next) {
		const query = { $or:[ {'accessToken': req.body.accessToken}]};
		// const atomArray = JSON.parse(JSON.stringify(req.body.atomIds));
		// const atomId = req.body.atomId;
		const atomID = req.body.atomID;
		const accept = req.body.accept;

		let journalID;


		// get user based off of ID
		User.findOne(query).lean().exec()
		.then(function(userResult) {
			if (!userResult) {
				throw new Error(ERROR.userNotFound);
			}
			if (!req.body.accessToken || !req.params.id || !req.body.atomID || !req.body.accept){
				throw new Error(ERROR.missingParam);
			}
			const userID = userResult._id;
			// return Link.setLinkInactive('submitted', atomID, journalID, userID, now, inactiveNote)
			// return Link.findOne('submitted', atomId, journalId, userResult._id, now);
			// return Link.findOne({type: 'admin', destination: journal._id, source: userResult._id, inactive: {$ne: true}}).lean().exec();
			// return [Link.findOne({source: atomID, destination: journalID, type: 'submitted', inactive: {$ne: true}}), userID]
			return userResult._id;
		})
		.then(function(userID){
			const query = isValidObjectID ? { $or:[ {'_id': req.params.id}, {'slug': req.params.id} ]} : { 'slug': req.params.id };
			const select = {_id: 1};
			return [userID, Journal.findOne(query, select).lean().exec() ]
		})
		.spread(function(userID, journal){
			if (!userID) {
				throw new Error(ERROR.userNotFound);
			}

			if(!journal){
				throw new Error('Journal not found')
			}

			if (!req.params.id || !req.query.accessToken){
				throw new Error(ERROR.missingParam);
			}
			journalID = journal._id;

			return [userID, Link.findOne({type: 'admin', destination: journal._id, source: userResult._id, inactive: {$ne: true}}).lean().exec()];
		})
		.spread(function(userID, link) {
			if (!link){
				throw new Error(ERROR.youDoNotHaveAccessToThisJournal)
			}

			return [userID, Link.createLink('featured', journalID, atomID, userID, now)]
		})
		.spread(function(userID, newLink) {
			const now = new Date().getTime();
			const inactiveNote = 'featured';
			return Link.setLinkInactive('submitted', atomID, journalID, userID, now, inactiveNote);
		})
		.then(function(updatedSubmissionLink) {
			return res.status(201).json(updatedSubmissionLink);
		})
		.catch(function(error) {
			console.log('error', error);
			return res.status(500).json(error);
		})


	});

	/* Route for                    */
	/* /journal/{slug}/collections  */
	/* /journal/{id}/collections    */
	app.get('/journal/:id/collections/', getCollections);

	/* Route for                                  */
	/* /journal/{slug}/collection/{collectionID}  */
	/* /journal/{id}/collection/{collectionID}    */
	app.get('/journal/:id/collection/:collectionID', function (req, res, next) {
		// Set the query based on whether the params.id is a valid ObjectID;
		const isValidObjectID = mongoose.Types.ObjectId.isValid(req.params.id);
		const query = isValidObjectID ? { $or:[ {'_id': req.params.id}, {'slug': req.params.id} ]} : { 'slug': req.params.id };

		// Set the parameters we'd like to return
		const select = {_id: 1, journalName: 1, slug: 1, collections: 1};

		// Make db call
		Journal.findOne(query, select).populate({path: 'collections', select: 'title createDate'}).lean().exec()
		.then(function(journalResult) {
			if (!journalResult) { throw new Error('Journal not found'); }

			const findFeaturedLinks = Link.find({source: journalResult._id, type: 'featured', 'metadata.collections': req.params.collectionID}, {_id: 1, destination: 1, createDate: 1, 'metadata.collections': 1}).populate({
				path: 'destination',
				model: Atom,
				select: 'title slug description previewImage type customAuthorString createDate lastUpdated isPublished',
			}).lean().exec();
			return [journalResult, findFeaturedLinks];
		})
		.spread(function(journalResult, featuredLinks) {
			const atoms = featuredLinks.filter((link)=> {
				return link.destination.isPublished;
			}).map((link)=> {
				const output = link.destination;
				output.collections = link.metadata.collections;
				output.featureDate = link.createDate
				delete output.isPublished;
				output.atomID = output._id;
				delete output._id;

				return output;
			});

			let collectionID;
			let collectionTitle;
			let collectionCreateDate;
			const collections = journalResult.collections || [];
			collections.map((item)=> {
				if (String(item._id) === String(req.params.collectionID)) {
					collectionID = item._id;
					collectionTitle = item.title;
					collectionCreateDate = item.createDate;
				}
			});

			const output = {
				collectionID: collectionID,
				title: collectionTitle,
				createDate: collectionCreateDate,
				atoms: atoms,
			};
			return res.status(200).json(output);
		})
		.catch(function(error) {
			return res.status(404).json('Collection not found');
		});
	});

		/* Route for  		*/
		/* /pubs/submit 	*/
		app.post('/pubs/:id/submit', submitPub);

	console.log("Server running on " + (process.env.PORT || 9876))
	app.listen(process.env.PORT || 9876);
})
.catch(function(e) { console.error("Error: %s", e.message); });
