import Promise from 'bluebird';
import app from '../../server';
import { redisClient, Pub, User, Label, Journal, Highlight, Contributor, PubFeature, Version } from '../../models';
import { userAttributes } from '../user/user';

export function searchUsers(req, res, next) {
	User.findAll({
		where: {
			$or: [
				{ firstName: { ilike: '%' + req.query.q + '%' } },
				{ lastName: { ilike: '%' + req.query.q + '%' } },
				{ username: { ilike: '%' + req.query.q + '%' } },
			]
		},
		attributes: userAttributes
	})
	.then(function(results) {
		return res.status(201).json(results);
	})
	.catch(function(err) {
		console.error('Error in searchUsers: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/search/user', searchUsers);

export function searchJournals(req, res, next) {
	Journal.findAll({
		where: {
			$or: [
				{ title: { ilike: '%' + req.query.q + '%' } },
				{ slug: { ilike: '%' + req.query.q + '%' } },
				{ description: { ilike: '%' + req.query.q + '%' } },
			]
		},
		attributes: ['id', 'title', 'slug', 'description', 'logo', 'avatar']
	})
	.then(function(results) {
		return res.status(201).json(results);
	})
	.catch(function(err) {
		console.error('Error in searchJournals: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/search/journal', searchJournals);

export function searchPubs(req, res, next) {
	Pub.findAll({
		where: {
			replyRootPubId: null,
			isPublished: true,
			$or: [
				{ title: { ilike: '%' + req.query.q + '%' } },
				{ slug: { ilike: '%' + req.query.q + '%' } },
				{ description: { ilike: '%' + req.query.q + '%' } },
			]
		},
		attributes: ['id', 'title', 'slug', 'description', 'avatar', 'isPublished']
	})
	.then(function(results) {
		return res.status(201).json(results);
	})
	.catch(function(err) {
		console.error('Error in searchPub: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/search/pub', searchPubs);

export function searchLabels(req, res, next) {
	Label.findAll({
		where: {
			userId: null,
			pubId: null,
			journalId: null,
			$or: [
				{ title: { ilike: '%' + req.query.q + '%' } },
			]
		},
		attributes: ['id', 'title']
	})
	.then(function(results) {
		return res.status(201).json(results);
	})
	.catch(function(err) {
		console.error('Error in searchLabels: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/search/label', searchLabels);

export function searchHighlights(req, res, next) {
	const user = req.user || {};
	const userId = user.id;
	const pubId = req.query.pubId;
	const search = req.query.q;
	Highlight.findAll({
		where: {
			$or: [
				{
					userId: userId,
					pubId: pubId,
				},
				{
					userId: userId,
					exact: { ilike: '%' + search + '%' },
				}
			]
		}
	})
	.then(function(results) {
		return res.status(201).json(results);
	})
	.catch(function(err) {
		console.error('Error in searchHighlights: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/search/highlight', searchHighlights);

export function searchAll(req, res, next) {
	const findPubs = Pub.findAll({
		where: {
			replyRootPubId: null,
			isPublished: true,
			$or: [
				{ title: { ilike: '%' + req.query.q + '%' } },
				{ slug: { ilike: '%' + req.query.q + '%' } },
				{ description: { ilike: '%' + req.query.q + '%' } },
			]
		},
		attributes: ['id', 'title', 'slug', 'description', 'avatar', 'isPublished']
	});

	const findUsers = User.findAll({
		where: {
			$or: [
				{ firstName: { ilike: '%' + req.query.q + '%' } },
				{ lastName: { ilike: '%' + req.query.q + '%' } },
				{ username: { ilike: '%' + req.query.q + '%' } },
			]
		},
		attributes: userAttributes
	});

	const findJournals = Journal.findAll({
		where: {
			$or: [
				{ title: { ilike: '%' + req.query.q + '%' } },
				{ slug: { ilike: '%' + req.query.q + '%' } },
				{ description: { ilike: '%' + req.query.q + '%' } },
			]
		},
		attributes: ['id', 'title', 'slug', 'description', 'logo', 'avatar']
	});

	const findLabels = Label.findAll({
		where: {
			userId: null,
			pubId: null,
			journalId: null,
			$or: [
				{ title: { ilike: '%' + req.query.q + '%' } },
			]
		},
		attributes: ['id', 'title']
	});

	Promise.all([findPubs, findUsers, findJournals, findLabels])
	.then(function(results) {
		return res.status(201).json({
			pubs: results[0],
			users: results[1],
			journals: results[2],
			labels: results[3],
		});
	})
	.catch(function(err) {
		console.error('Error in searchAll: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/search/all', searchAll);

export function searchFeatured(req, res, next) {
	const findPubs = Pub.findAll({
		where: {
			replyRootPubId: null,
			isPublished: true,
			$or: [
				{ slug: 'designandscience' },
				{ slug: 'about' },
			]
		},
		include: [
			{ model: Contributor, separate: true, as: 'contributors', include: [{ model: User, as: 'user', attributes: userAttributes }] }, // Filter to remove hidden if not authorized
			{ model: User, as: 'followers', attributes: userAttributes }, // Filter to remove FollowsPub data from all but user
			{ model: Version, separate: true, as: 'versions' },
			{ model: Pub, as: 'discussions', separate: true },
			{ model: Label, as: 'labels', through: { attributes: [] } }, // These are labels applied to the pub
			{ model: PubFeature, separate: true, as: 'pubFeatures', include: [{ model: Journal, as: 'journal' }] },
		],
		attributes: ['id', 'title', 'slug', 'description', 'avatar', 'isPublished']
	});

	const findJournals = Journal.findAll({
		where: {
			$or: [
				{ slug: 'jods' },
				{ slug: 'resci' },
			]
		},
		attributes: ['id', 'title', 'slug', 'description', 'logo', 'avatar']
	});

	console.time('searchQueryTime');
	redisClient.getAsync('_featuredItems').then(function(redisResult) {
		if (redisResult) { return redisResult; }
		return Promise.all([findPubs, findJournals]);
	})
	.then(function(results) {
		if (!results) { throw new Error('Results not found'); }
		// const outputData = results[0][0].toJSON ? pubData.toJSON() : JSON.parse(pubData);

		console.log('Using Cache: ', !results[0][0].toJSON);
		const outputData = [];
		if (results[0][0].toJSON) {
			outputData[0] = results[0].map(item => item.toJSON());
			outputData[1] = results[1].map(item => item.toJSON());
		} else {
			outputData[0] = JSON.parse(results)[0];
			outputData[1] = JSON.parse(results)[1];
		}
		
		const cacheTimeout = process.env.IS_PRODUCTION_API === 'TRUE' ? 60 * 60 * 12 : 10;
		const setCache = results[0][0].toJSON ? redisClient.setexAsync('_featuredItems', cacheTimeout, JSON.stringify(outputData)) : {};
		return Promise.all([outputData, setCache]);
	})
	.spread(function(results, cacheSetResult) {
		console.timeEnd('searchQueryTime');
		return res.status(201).json({
			pubs: results[0].map((pub)=> {
				return {
					...pub,
					followers: pub.followers.map((follower)=> {
						return follower.id;
					}),
					contributors: pub.contributors.filter((contributor)=> {
						return !contributor.isHidden;
					}),
					discussions: pub.discussions.filter((discussion)=> {
						return discussion.isPublished;
					})
					.map((discussion)=> {
						return discussion.id;
					}),
					versions: pub.versions.filter((version)=> {
						return version.isPublished;
					}),
				};
			}),
			journals: results[1],
		});
	})
	.catch(function(err) {
		console.error('Error in searchFeatured: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/search/featured', searchFeatured);
