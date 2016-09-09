const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

const Journal = require('./models').Journal;
const User = require('./models').User;
const Atom = require('./models').Atom;
const Link = require('./models').Link;


export function getFeatured(req, res, next) {
  console.log("getFeatured")
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
		return res.status(404).json('Journal not found');
	});
}


export function getJournalByID(req, res, next) {
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
}
