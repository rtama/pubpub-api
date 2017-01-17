import Promise from 'bluebird';
import app from '../../server';
import { Pub, User, Label, Journal } from '../../models';
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
		console.error('Error in searchUser: ', err);
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
				{ shortDescription: { ilike: '%' + req.query.q + '%' } },
			]
		},
		attributes: ['id', 'title', 'slug', 'shortDescription', 'logo', 'icon']
	})
	.then(function(results) {
		return res.status(201).json(results);
	})
	.catch(function(err) {
		console.error('Error in searchJournal: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/search/journal', searchJournals);

export function searchPubs(req, res, next) {
	Pub.findAll({
		where: {
			replyRootPubId: null,
			$or: [
				{ title: { ilike: '%' + req.query.q + '%' } },
				{ slug: { ilike: '%' + req.query.q + '%' } },
				{ description: { ilike: '%' + req.query.q + '%' } },
			]
		},
		attributes: ['id', 'title', 'slug', 'description', 'avatar']
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
		console.error('Error in searchLabel: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/search/label', searchLabels);

export function searchAll(req, res, next) {
	const findPubs = Pub.findAll({
		where: {
			replyRootPubId: null,
			$or: [
				{ title: { ilike: '%' + req.query.q + '%' } },
				{ slug: { ilike: '%' + req.query.q + '%' } },
				{ description: { ilike: '%' + req.query.q + '%' } },
			]
		},
		attributes: ['id', 'title', 'slug', 'description', 'avatar']
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
				{ shortDescription: { ilike: '%' + req.query.q + '%' } },
			]
		},
		attributes: ['id', 'title', 'slug', 'shortDescription', 'logo', 'icon']
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
