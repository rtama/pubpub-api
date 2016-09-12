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
    console.log("Featured links! " + JSON.stringify(featuredLinks))
		const atoms = featuredLinks.filter((link)=> {
      console.log("Returning " + link.destination.isPublished)
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

		// const output = {
		// 	journalID: journalResult._id,
		// 	journalName: journalResult.journalName,
		// 	slug: journalResult.slug,
		// 	atoms: atoms,
		// };

		return res.status(200).json(atoms);
	})
	.catch(function(error) {
		return res.status(404).json('Journal not found');
	});
}


export function getJournal(req, res, next) {
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

export function getCollections(req, res, next) {
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
}

export function getSubmissions(req, res, next) {
  const isValidObjectID = mongoose.Types.ObjectId.isValid(req.params.id);

  // const journalID = req.params.id;
  // const userQuery = { $or:[ ]};
  const accessToken = req.query.accessToken;

  // see if accessToken grants access to this user
  User.findOne({'accessToken': accessToken}).lean().exec()
  .then(function(userResult){
    console.log("Yes found user through accessToken: " + JSON.stringify(userResult))
    const query = isValidObjectID ? { $or:[ {'_id': req.params.id}, {'slug': req.params.id} ]} : { 'slug': req.params.id };
    const select = {_id: 1};
    return [userResult, Journal.findOne(query, select).lean().exec() ]
  })
  .spread(function(userResult, journal){
    if (!userResult) {
      throw new Error(ERROR.userNotFound);
    }

    if(!journal){
      throw new Error('Journal not found')
    }

    if (!req.params.id || !req.query.accessToken){
      throw new Error(ERROR.missingParam);
    }

    return Link.findOne({type: 'admin', destination: journal._id, source: userResult._id, inactive: {$ne: true}}).lean().exec();
  })
  .then(function(link){
    if (!link){
      throw new Error(ERROR.youDoNotHaveAccessToThisJournal)
    }
    return link;
  })
  .then(function(link){
    // Set the parameters we'd like to return
    const select = {_id: 1, slug: 1, createDate: 1, source: 1};

    return Link.find({destination: link.destination, type: 'submitted', inactive: {$ne: true}}, select)
    .populate({
        path: 'source',
        model: Atom,
        select: 'title slug description',
      }).exec();
  }).then(function(links){
    console.log("Yeppers here")
    links = links.map(function(link){
      return {id: link.source._id, slug: link.source.slug, title: link.source.title, description: link.source.description, createDate: link.createDate};
    })
    return res.status(200).json(links);
  })
  .catch(function(error){
    console.log("THERE WAS AN ERROR " + error)
    return res.status(404).json(error);
  });
}
