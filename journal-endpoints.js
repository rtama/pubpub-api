import { NotModified, BadRequest, Unauthorized } from './errors';

const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

const Journal = require('./models').Journal;
const User = require('./models').User;
const Atom = require('./models').Atom;
const Link = require('./models').Link;

export function getFeatured(req, res, next) {
	// Set the query based on whether the params.id is a valid ObjectID;
	const isValidObjectID = mongoose.Types.ObjectId.isValid(req.params.id);
	const query = isValidObjectID ? { $or:[ {'_id': req.params.id}, {'slug': req.params.id} ]} : { 'slug': req.params.id };

	// Set the parameters we'd like to return
	const select = {_id: 1, journalName: 1, slug: 1};

	// Make db call
	Journal.findOne(query, select).populate({path: 'collections', select: 'title createDate'}).lean().exec()
	.then(function(journalResult) {
		if (!journalResult) { BadRequest(); }

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

		// const output = {
		// 	journalID: journalResult._id,
		// 	journalName: journalResult.journalName,
		// 	slug: journalResult.slug,
		// 	atoms: atoms,
		// };

		return res.status(200).json(atoms);
	})
	.catch(function(error) {
		return res.status(error.status).json(error.message);
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
    if (!journalResult) { throw new BadRequest(); }

    journalResult.journalID = journalResult._id;
    delete journalResult._id;

    return res.status(200).json(journalResult);
  })
  .catch(function(error) {
		return res.status(error.status).json(error.message);
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
    if (!journalResult) { throw new BadRequest(); }

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
		return res.status(error.status).json(error.message);
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
    const query = isValidObjectID ? { $or:[ {'_id': req.params.id}, {'slug': req.params.id} ]} : { 'slug': req.params.id };
    const select = {_id: 1};
    return [userResult, Journal.findOne(query, select).lean().exec() ]
  })
  .spread(function(userResult, journal){
    if (!userResult) {
      throw new BadRequest();
    }

    if(!journal){
      throw new BadRequest();
    }

    if (!req.params.id || !req.query.accessToken) {
      throw new BadRequest();
    }

    return Link.findOne({type: 'admin', destination: journal._id, source: userResult._id, inactive: {$ne: true}}).lean().exec();
  })
  .then(function(link){
    if (!link){
      throw new Unauthorized();
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
    links = links.map(function(link){
      return {id: link.source._id, slug: link.source.slug, title: link.source.title, description: link.source.description, createDate: link.createDate};
    })
    return res.status(200).json(links);
  })
  .catch(function(error){
		return res.status(error.status).json(error.message);
  });
}

export function getJournalCollection(req, res, next) {
	// Set the query based on whether the params.id is a valid ObjectID;
	const isValidObjectID = mongoose.Types.ObjectId.isValid(req.params.id);
		const query = isValidObjectID ? { $or:[ {'_id': req.params.id}, {'slug': req.params.id} ]} : { 'slug': req.params.id };

	// Set the parameters we'd like to return
	const select = {_id: 1, journalName: 1, slug: 1, collections: 1};

	// Make db call
	Journal.findOne(query, select).populate({path: 'collections', select: 'title createDate'}).lean().exec()
	.then(function(journalResult) {
		if (!journalResult) { throw new BadRequest(); }

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
		return res.status(error.status).json(error.message);
	});
}

export function featurePub(req, res, next) {
	const query = { $or:[ { 'accessToken': req.body.accessToken }] };
	// const atomArray = JSON.parse(JSON.stringify(req.body.atomIds));
	// const atomId = req.body.atomId;
	const atomID = req.body.atomID;
	const accept = req.body.accept;

	let journalID;

	// get user based off of ID
	User.findOne(query).lean().exec()
	.then(function(userResult) {
		console.log('user Find One!:D' + JSON.stringify(userResult))
		if (!userResult) {
			throw new BadRequest();
		}
		if (!req.body.accessToken || !req.params.id || !req.body.atomID || !req.body.accept) {
			throw new BadRequest();
		}
		const userID = userResult._id;
		// return Link.setLinkInactive('submitted', atomID, journalID, userID, now, inactiveNote)
		// return Link.findOne('submitted', atomId, journalId, userResult._id, now);
		// return Link.findOne({type: 'admin', destination: journal._id, source: userResult._id, inactive: {$ne: true}}).lean().exec();
		// return [Link.findOne({source: atomID, destination: journalID, type: 'submitted', inactive: {$ne: true}}), userID]
		return userResult._id;
	})
	.then(function(userID) {
		console.log('SMITTER')
		const query = isValidObjectID ? { $or:[ {'_id': req.params.id}, {'slug': req.params.id} ]} : { 'slug': req.params.id };
		const select = {_id: 1};
		return [userID, Journal.findOne(query, select).lean().exec() ];
	})
	.spread(function(userID, journal) {
		console.log('Hello ' + userID + ' .. ' + journal)
		if (!userID) {
			throw new BadRequest();
		}

		if(!journal) {
			throw new BadRequest();
		}

		if (!req.params.id || !req.query.accessToken) {
			throw new BadRequest();
		}
		journalID = journal._id;

		return [userID, Link.findOne({ type: 'admin', destination: journal._id, source: userResult._id, inactive: { $ne: true } }).lean().exec()];
	})
	.spread(function (userID, link) {
		console.log('HEYYOOO')
		if (!link) {
			throw new Unauthorized();
		}
	return [userID, Link.findOne( { type: 'featured', destination: journalID, source: atomID })]

}).spread(function(userID, link){
		console.log('Does a link already exist? ' + link)
		if (link){
			throw new NotModified();
		}
		return [userID, Link.createLink('featured', journalID, atomID, userID, now)]
	})
	.spread(function (userID, newLink) {
		const now = new Date().getTime();
		const inactiveNote = 'featured';
		return Link.setLinkInactive('submitted', atomID, journalID, userID, now, inactiveNote);
	})
	.then(function(updatedSubmissionLink) {
		console.log ('Works properly ')
		return res.status(200).json(updatedSubmissionLink);
	})
	.catch(function(error) {
		console.log('error ' + JSON.stringify(error));
		return res.status(error.status).json(error.message);
	})

}
