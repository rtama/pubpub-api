require('babel-register');

require('./config.js');
const osprey = require('osprey');
const express = require('express');
const join = require('path').join;
const app = express();

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

	app.use(function (err, req, res, next) {
		// Handle errors.
		console.log("Error! " + err + ", " + next)
		next();
	});

	/* Route for         */
	/* /user/{username}  */
	/* /user/{id}        */
	app.get('/user/:id/', function (req, res, next) {
		// Set the query based on whether the params.id is a valid ObjectID;
		const isValidObjectID = mongoose.Types.ObjectId.isValid(req.params.id);
		const query = isValidObjectID ? { $or:[ {'_id': req.params.id}, {'username': req.params.id} ]} : { 'username': req.params.id };
		
		// Set the parameters we'd like to return
		const select = {_id: 1, username: 1, firstName: 1, lastName: 1, name: 1, image: 1, bio: 1, publicEmail: 1, github: 1, orcid: 1, twitter: 1, website: 1, googleScholar: 1};
		
		// Make db call
		User.findOne(query, select).lean().exec()
		.then(function(userResult) {
			if (!userResult) { throw new Error('User not found'); }
			
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
			
			return res.status(200).json(journalResult);
		})
		.catch(function(error) {
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
		const select = {_id: 1, journalName: 1, slug: 1, collections: 1};
		
		// Make db call
		Journal.findOne(query, select).populate({path: 'collections', select: 'title createDate'}).lean().exec()
		.then(function(journalResult) {
			if (!journalResult) { throw new Error('Journal not found'); }

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
			const output = journalResult;
			output.featured = featuredLinks.filter((link)=> {
				return link.destination.isPublished;
			}).map((link)=> {
				link.atom = link.destination;
				delete link.atom.isPublished;
				delete link.destination;
				return link;
			});

			return res.status(200).json(output);
		})
		.catch(function(error) {
			console.log(error);
			return res.status(404).json('Journal not found');
		});
	});


	app.listen(9876);
})
.catch(function(e) { console.error("Error: %s", e.message); });
