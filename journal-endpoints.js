import { NotModified, BadRequest, Unauthorized, NotFound } from './errors';

const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

const Journal = require('./models').Journal;
const User = require('./models').User;
const Atom = require('./models').Atom;
const Link = require('./models').Link;

export function getFeatured(req, res, next) {
	// Set the query based on whether the params.id is a valid ObjectID;
	const isValidObjectID = mongoose.Types.ObjectId.isValid(req.params.id);
	const query = isValidObjectID ? { $or: [{ _id: req.params.id },
		{ slug: req.params.id }] } : { slug: req.params.id };

	// Set the parameters we'd like to return
	const select = { _id: 1, journalName: 1, slug: 1 };

	Journal.find(query).select(select).populate({ path: 'collections', select: 'title createDate slug' }).lean()
	.exec()
	.then((journalResult) => {
		if (!journalResult) { // || (!isValidObjectID && journalResult != req.params.id)
			throw new NotFound();
		}

		const findFeaturedLinks = Link.find({ source: journalResult._id, type: 'featured' }, { _id: 1, destination: 1, createDate: 1, 'metadata.collections': 1 }).populate({
			path: 'destination',
			model: Atom,
			select: 'title slug description previewImage type customAuthorString createDate lastUpdated isPublished',
		}).lean().exec();
		return [journalResult, findFeaturedLinks];
	})
	.spread((journalResult, featuredLinks) => {
		const atoms = featuredLinks.filter((link) => {
			return link.destination.isPublished;
		}).map((link) => {
			const output = link.destination;
			output.collections = link.metadata.collections;
			output.featureDate = link.createDate;
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
	.catch((error) => {
		return res.status(error.status).json(error.message);
	});
}


export function getJournal(req, res, next) {
	// Set the query based on whether the params.id is a valid ObjectID;
	const isValidObjectID = mongoose.Types.ObjectId.isValid(req.params.id);
	const query = isValidObjectID ? { $or: [{ _id: req.params.id }, { slug: req.params.id }] } : { slug: req.params.id };

	// Set the parameters we'd like to return
	const select = { _id: 1, journalName: 1, slug: 1, description: 1, logo: 1, icon: 1, about: 1, website: 1, twitter: 1, facebook: 1, headerColor: 1, headerImage: 1 };

	// Make db call
	Journal.findOne(query, select).lean().exec()
	.then((journalResult) => {
		if (!journalResult) { throw new NotFound(); }

		journalResult.journalID = journalResult._id;
		delete journalResult._id;

		return res.status(200).json(journalResult);
	})
	.catch((error) => {
		return res.status(error.status).json(error.message);
	});
}

export function getCollections(req, res, next) {
	// Set the query based on whether the params.id is a valid ObjectID;
	const isValidObjectID = mongoose.Types.ObjectId.isValid(req.params.id);
	const query = isValidObjectID ? { $or: [{ _id: req.params.id }, { slug: req.params.id }] } : { slug: req.params.id };

	// Set the parameters we'd like to return
	const select = { _id: 1, collections: 1, journalName: 1, slug: 1 };

	// Make db call
	Journal.findOne(query, select).populate({ path: 'collections', select: 'title createDate' }).lean().exec()
	.then((journalResult) => {
		if (!journalResult) { throw new BadRequest(); }

		const output = {
			journalID: journalResult._id,
			journalName: journalResult.journalName,
			slug: journalResult.slug,
			collections: journalResult.collections.map((collection) => {
				collection.collectionID = collection._id;
				delete collection._id;
				return collection;
			})
		}
		return res.status(200).json(output);
	})
	.catch((error) => {
		return res.status(error.status).json(error.message);
	});
}

export function getSubmissions(req, res, next) {
	console.log("getSubmissions")

	const isValidObjectID = mongoose.Types.ObjectId.isValid(req.params.id);
	const userID = req.user._id;
	const user = req.user;

	const query = isValidObjectID ? { $or: [{ _id: req.params.id },
			{ slug: req.params.id }] } : { slug: req.params.id };
	const select = { _id: 1 };

	Journal.findOne(query, select).lean().exec()
	.then((journalResult) => {
		console.log("journal Result " + journalResult)
		if (!journalResult) {
			throw new NotFound();
		}

		if (!req.params.id) {
			throw new BadRequest();
		}

		return Link.findOne({ type: 'admin', destination: journalResult._id, source: user._id, inactive: { $ne: true } }).lean().exec();
	})
	.then((link) => {
		console.log("Grabbing a link " + link)
		if (!link) {
			throw new Unauthorized();
		}
		return link;
	})
	.then((link) => {
		// Set the parameters we'd like to return
		const select = { _id: 1, slug: 1, createDate: 1, source: 1};

		return Link.find({ destination: link.destination, type: 'submitted', inactive: { $ne: true } }, select)
		.populate({
			path: 'source',
			model: Atom,
			select: 'title slug description',
		}).exec();
	})
	.then((links) => {
		links = links.map((link) => {
			return {
				id: link.source._id,
				slug: link.source.slug,
				title: link.source.title,
				description: link.source.description,
				createDate: link.createDate };
		});
		return res.status(200).json(links);
	})
	.catch((error) => {
		return res.status(error.status).json(error.message);
	});
}

export function getJournalCollection(req, res, next) {
	// Set the query based on whether the params.id is a valid ObjectID;
	const isValidObjectID = mongoose.Types.ObjectId.isValid(req.params.id);
	const query = isValidObjectID ? { $or: [{ _id: req.params.id }, { slug: req.params.id }] } : { slug: req.params.id };

	// Set the parameters we'd like to return
	const select = { _id: 1, journalName: 1, slug: 1, collections: 1 };

	// Make db call
	Journal.findOne(query, select).populate({ path: 'collections', select: 'title createDate' }).lean().exec()
	.then((journalResult) => {
		if (!journalResult) { throw new BadRequest(); }

		const findFeaturedLinks = Link.find({ source: journalResult._id, type: 'featured', 'metadata.collections': req.params.collectionID }, { _id: 1, destination: 1, createDate: 1, 'metadata.collections': 1 }).populate({
			path: 'destination',
			model: Atom,
			select: 'title slug description previewImage type customAuthorString createDate lastUpdated isPublished',
		}).lean().exec();
		return [journalResult, findFeaturedLinks];
	})
	.spread((journalResult, featuredLinks) => {
		const atoms = featuredLinks.filter((link) => {
			return link.destination.isPublished;
		}).map((link) => {
			const output = link.destination;
			output.collections = link.metadata.collections;
			output.featureDate = link.createDate;
			delete output.isPublished;
			output.atomID = output._id;
			delete output._id;

			return output;
		});

		let collectionID;
		let collectionTitle;
		let collectionCreateDate;
		const collections = journalResult.collections || [];
		collections.map((item) => {
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
	.catch((error) => {
		return res.status(error.status).json(error.message);
	});
}

export function featurePub(req, res, next) {
	const isValidObjectID = mongoose.Types.ObjectId.isValid(req.params.id);

	const userID = req.user._id;
	const user = req.user;

	// const atomArray = JSON.parse(JSON.stringify(req.body.atomIds));
	// const atomId = req.body.atomId;
	const atomID = req.body.atomID;
	const accept = req.body.accept;
	let journalID;

		if (!req.params.id || !req.body.atomID || !req.body.accept) {
			throw new BadRequest();
		}
		// return Link.setLinkInactive('submitted', atomID, journalID, userID, now, inactiveNote)
		// return Link.findOne('submitted', atomId, journalId, user._id, now);
		// return Link.findOne({type: 'admin', destination: journal._id, source: user._id, inactive: {$ne: true}}).lean().exec();
		// return [Link.findOne({source: atomID, destination: journalID, type: 'submitted', inactive: {$ne: true}}), userID]

		const query = isValidObjectID ? { $or: [{ _id: req.params.id }, { slug: req.params.id }] } : { slug: req.params.id };
		const select = { _id: 1 };
		Journal.findOne(query, select).lean().exec()
		.then((journal) => {
		if (!userID) {
			throw new BadRequest();
		}

		if (!journal) {
			throw new BadRequest();
		}

		journalID = journal._id;

		return [userID, Link.findOne({ type: 'admin', destination: journal._id, source: userID, inactive: { $ne: true } }).lean().exec()];
	})
	.spread((userID, link) => {
		if (!link) {
			throw new Unauthorized();
		}
		return [userID, Link.findOne( { type: 'featured', destination: atomID, source: journalID })];

	})
	.spread((userID, link) => {
		if (link) {
			throw new NotModified();
		}
		const now = new Date().getTime();
		return [userID, Link.createLink('featured', journalID, atomID, userID, now)];
	})
	.spread((userID, newLink) => {
		const now = new Date().getTime();
		const inactiveNote = 'featured';
		return Link.setLinkInactive('submitted', atomID, journalID, userID, now, inactiveNote);
	})
	.then((updatedSubmissionLink) => {
		return res.status(200).json(updatedSubmissionLink);
	})
	.catch((error) => {
		console.log(`error  + ${error}`);
		return res.status(error.status).json(error.message);
	});
}
