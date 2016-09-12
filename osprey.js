import { getFeatured, getCollections, getJournal, getSubmissions, getJournalCollection } from './journal-endpoints';
import { getUserByID } from './user-endpoints';
import { submitPub } from './pub-endpoints';

if (process.env.NODE_ENV !== 'production') {
	require('./config');
} else {
	console.log("Production not implemented yet, needs the right vars set, etc")
}

const osprey = require('osprey');
const express = require('express');
const bodyParser = require('body-parser');
const join = require('path').join;

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const path = join(__dirname, 'api.raml');

const mongoose = require('mongoose');
const Journal = require('./models').Journal;
const User = require('./models').User;
const Atom = require('./models').Atom;
const Link = require('./models').Link;
mongoose.Promise = require('bluebird');

mongoose.connect(process.env.MONGO_URI);


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
				throw new Error();
			}
			if (!req.body.accessToken || !req.params.id || !req.body.atomID || !req.body.accept){
				throw new Error('Required parameter missing');
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
				throw new Error();
			}

			if(!journal){
				throw new Error('Journal not found')
			}

			if (!req.params.id || !req.query.accessToken){
				throw new Error('Required parameter missing');
			}
			journalID = journal._id;

			return [userID, Link.findOne({type: 'admin', destination: journal._id, source: userResult._id, inactive: {$ne: true}}).lean().exec()];
		})
		.spread(function(userID, link) {
			if (!link){
				throw new Error('You do not have access to this action')
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
	app.get('/journal/:id/collection/:collectionID', getJournalCollection);

	/* Route for  		*/
	/* /pubs/{id}/submit 	*/
	app.post('/pubs/:id/submit', submitPub);

	console.log(`Server running on ${process.env.PORT || 9876}`)
	app.listen(process.env.PORT || 9876);
})
.catch(function (error) { console.error("Error: %s", error.message); });
