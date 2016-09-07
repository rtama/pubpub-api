if (process.env.NODE_ENV !== 'production') {
	require('./config.js');
}

const osprey = require('osprey');
const express = require('express');
const join = require('path').join;
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());

const path = join(__dirname, 'api.raml');

const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
mongoose.connect(process.env.MONGO_URI);
const Journal = require('./models').Journal;
const User = require('./models').User;
const Atom = require('./models').Atom;
const Link = require('./models').Link;

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
	app.get('/user/:id/', function (req, res, next) {
		const x = {fish: 5};
		const y = {...x};
		// Set the query based on whether the params.id is a valid ObjectID;
		const isValidObjectID = mongoose.Types.ObjectId.isValid(req.params.id);
		const query = isValidObjectID ? { $or:[ {'_id': req.params.id}, {'username': req.params.id} ]} : { 'username': req.params.id };

		// Set the parameters we'd like to return
		const select = {_id: 1, username: 1, firstName: 1, lastName: 1, name: 1, image: 1, bio: 1, publicEmail: 1, github: 1, orcid: 1, twitter: 1, website: 1, googleScholar: 1};

		// Make db call
		User.findOne(query, select).lean().exec()
		.then(function(userResult) {
			if (!userResult) { throw new Error('User not found'); }

			userResult.userID = userResult._id;
			delete userResult._id;

			return res.status(200).json(userResult);
		})
		.catch(function(error) {
			return res.status(404).json('User not found');
		});
	});

	/* Route for         */
	/* /journal/{slug}   */
	/* /journal/{id}     */
	app.get('/journal/:id/', function (req, res, next) {
		// Set the query based on whether the params.id is a valid ObjectID;
		const isValidObjectID = mongoose.Types.ObjectId.isValid(req.params.id);
		const query = isValidObjectID ? { $or:[ {'_id': req.params.id}, {'slug': req.params.id} ]} : { 'slug': req.params.id };

		// Set the parameters we'd like to return
		const select = {_id: 1, journalName: 1, slug: 1, description: 1, logo: 1, icon: 1, about: 1, website: 1, twitter: 1, facebook: 1, headerColor: 1, headerImage: 1};

		// Make db call
		Journal.findOne(query, select).lean().exec()
		.then(function(journalResult) {
			if (!journalResult) { throw new Error('Journal not found'); }

			journalResult.journalID = journalResult._id;
			delete journalResult._id;

			return res.status(200).json(journalResult);
		})
		.catch(function(error) {
			return res.status(404).json('Journal not found');
		});
	});

	/* Route for                 */
	/* /journal/{slug}/featured  */
	/* /journal/{id}/featured    */
	app.get('/journal/:id/featured/', function (req, res, next) {
		// Set the query based on whether the params.id is a valid ObjectID;
		const isValidObjectID = mongoose.Types.ObjectId.isValid(req.params.id);
		const query = isValidObjectID ? { $or:[ {'_id': req.params.id}, {'slug': req.params.id} ]} : { 'slug': req.params.id };

		// Set the parameters we'd like to return
		const select = {_id: 1, journalName: 1, slug: 1};

		// Make db call
		Journal.findOne(query, select).populate({path: 'collections', select: 'title createDate'}).lean().exec()
		.then(function(journalResult) {
			if (!journalResult) { throw new Error('Journal not found'); }

			const findFeaturedLinks = Link.find({source: journalResult._id, type: 'featured'}, {_id: 1, destination: 1, createDate: 1, 'metadata.collections': 1}).populate({
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

			const output = {
				journalID: journalResult._id,
				journalName: journalResult.journalName,
				slug: journalResult.slug,
				atoms: atoms,
			};

			return res.status(200).json(output);
		})
		.catch(function(error) {
			console.log(error);
			return res.status(404).json('Journal not found');
		});
	});

	/* Route for                    */
	/* /journal/{slug}/collections  */
	/* /journal/{id}/collections    */
	app.get('/journal/:id/collections/', function (req, res, next) {
		// Set the query based on whether the params.id is a valid ObjectID;
		const isValidObjectID = mongoose.Types.ObjectId.isValid(req.params.id);
		const query = isValidObjectID ? { $or:[ {'_id': req.params.id}, {'slug': req.params.id} ]} : { 'slug': req.params.id };

		// Set the parameters we'd like to return
		const select = {_id: 1, collections: 1, journalName: 1, slug: 1};

		// Make db call
		Journal.findOne(query, select).populate({path: 'collections', select: 'title createDate'}).lean().exec()
		.then(function(journalResult) {
			if (!journalResult) { throw new Error('Journal not found'); }

			const output = {
				journalID: journalResult._id,
                journalName: journalResult.journalName,
                slug: journalResult.slug,
                collections: journalResult.collections.map((collection)=> {
                	collection.collectionID = collection._id;
                	delete collection._id;
                	return collection;
                })
			}
			return res.status(200).json(output);
		})
		.catch(function(error) {
			return res.status(404).json('Journal not found');
		});
	});

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
			console.log(error);
			return res.status(404).json('Collection not found');
		});
	});

		/* Route for  		*/
		/* /pubs/submit 	*/
		app.post('/pubs/submit', function (req, res, next) {
			// const isValidObjectID = mongoose.Types.ObjectId.isValid(req.body.accessToken);
			// const isValidObjectID = mongoose.Types.ObjectId.isValid(req.body.journalId);
			const query = { $or:[ {'accessToken': req.body.accessToken}]};
			const atomArray = JSON.parse(JSON.stringify(req.body.atomIds));

			const journalId = req.body.journalId;


			let promises = [];

			User.findOne(query).lean().exec()
			.then(function(userResult) {
				if (!userResult) {
					throw new Error('User not found');
				}

				const now = new Date().getTime();

				for (let i = 0; i < atomArray.length; i++){
					promises.push(Link.createLink('submitted', atomArray[i], journalId, userResult._id, now))
				}

				return Promise.all(promises);
			}).then(function(idk){
				return res.status(202).json('Success');
			})
			.catch(function(error){
				return res.status(404).json('Error ' + error);

			});
			//see which user the API Key belongs to, if any
			//if it's an invalid API key then respond with an error ? (How to protect against Brute forcing?)
		});


	app.listen(process.env.PORT || 9876);
})
.catch(function(e) { console.error("Error: %s", e.message); });
