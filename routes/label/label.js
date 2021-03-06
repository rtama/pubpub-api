import app from '../../server';
import { redisClient, Pub, Label, Contributor, JournalAdmin, User } from '../../models';
import { createActivity } from '../../utilities/createActivity';
import { userAttributes } from '../user/user';

export function queryForLabel(value) {
	const where = isNaN(value) 
		? { slug: value, userId: null, journalId: null, pubId: null }
		: { id: value, userId: null, journalId: null, pubId: null };

	return Label.findOne({
		where: where,
		attributes: ['id', 'slug', 'title', 'color', 'journalId', 'userId', 'pubId', 'isDisplayed', 'description'],
		include: [
			{ model: Pub, as: 'pubs', where: { isPublished: true }, required: false },
			{ model: User, as: 'followers', attributes: userAttributes }, 
		],
	});
	
}

export function getLabel(req, res, next) {
	// Return a single global label and the associated pubs
	console.time('labelQueryTime');
	redisClient.getAsync('l_' + req.query.slug).then(function(redisResult) {
		if (redisResult) { return redisResult; }
		return queryForLabel(req.query.slug);
	})
	.then(function(labelData) {
		if (!labelData) { throw new Error('Label not Found'); }
		const outputData = labelData.toJSON ? labelData.toJSON() : JSON.parse(labelData);
		console.log('Using Cache: ', !labelData.toJSON);
		const cacheTimeout = process.env.IS_PRODUCTION_API === 'TRUE' ? 60 * 10 : 10;
		const setCache = labelData.toJSON ? redisClient.setexAsync('l_' + req.query.slug, cacheTimeout, JSON.stringify(outputData)) : {};
		return Promise.all([outputData, setCache]);
	})
	.spread(function(labelData, setCacheResult) {
		console.timeEnd('labelQueryTime');
		if (!labelData) { return res.status(500).json('Label not found'); }

		return res.status(201).json(labelData);
	})
	.catch(function(err) {
		console.error('Error in getLabels: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/label', getLabel);

export function postLabel(req, res, next) {

	const user = req.user || {};
	if (Number(!!req.body.userId) + Number(!!req.body.pubId) + Number(!!req.body.journalId) !== 1) { return res.status(500).json('A new label must be associated with a single userId, pubId, or journalId'); }

	let authenticateAndCreate;

	// TODO: For global labels, set slug
	// slug: req.body.title.replace(/[^\w\s-]/gi, '').replace(/ /g, '-').toLowerCase(),

	// If userId is supplied, authenticate and create
	if (req.body.userId) {
		if (req.body.userId !== user.id && user.id !== 14) { return res.status(500).json('Not authorized to create a label for this userId'); }
		authenticateAndCreate = Label.create({
			userId: req.body.userId,
			title: req.body.title,
			color: req.body.color,
		});
	}

	// If pubId is supplied, authenticate and create
	if (req.body.pubId) {
		authenticateAndCreate = Contributor.findOne({
			where: { pubId: req.body.pubId, userId: user.id },
			raw: true,
		})
		.then(function(contributor) {
			if ((!contributor || (!contributor.canEdit && !contributor.isAuthor) && user.id !== 14)) {
				throw new Error('Not Authorized to create a label for this pubId');
			}
			return Label.create({
				pubId: req.body.pubId,
				title: req.body.title,
				color: req.body.color,
			});
		});
	}

	// If journalId is supplied, authenticate and create
	if (req.body.journalId) {
		authenticateAndCreate = JournalAdmin.findOne({
			where: { journalId: req.body.journalId, userId: user.id },
			raw: true,
		})
		.then(function(journalAdmin) {
			if ((!journalAdmin || !req.body.title) && user.id !== 14) {
				throw new Error('Not Authorized to create a label for this journalId');
			}

			return Label.create({
				journalId: req.body.journalId,
				title: req.body.title,
				slug: req.body.title.replace(/[^\w\s-]/gi, '').trim().replace(/ /g, '-').toLowerCase(),
				color: req.body.color,
				isDisplayed: req.body.isDisplayed,
				description: req.body.description,
				order: req.body.order,
				depth: req.body.depth,
			});
		});
	}
	
	authenticateAndCreate
	.then(function(newLabel) {
		if (newLabel.journalId) {
			return [newLabel, createActivity('createdJournalLabel', newLabel.journalId, newLabel.id)];	
		}
		return [newLabel, {}];
	})
	.spread(function(newLabel, newActivity) {
		return res.status(201).json(newLabel);
	})
	.catch(function(err) {
		console.error('Error in postLabels: ', err);
		return res.status(500).json(err.message);
	});
}
app.post('/label', postLabel);

export function putLabel(req, res, next) {
	const user = req.user || {};
	if (Number(!!req.body.userId) + Number(!!req.body.pubId) + Number(!!req.body.journalId) !== 1) { return res.status(500).json('A label must be associated with a single userId, pubId, or journalId'); }

	let authenticateAndUpdate;

	const updatedLabel = {};
	Object.keys(req.body).map((key)=> {
		if (['color', 'title', 'description', 'isDisplayed', 'order', 'depth'].indexOf(key) > -1) {
			updatedLabel[key] = req.body[key];
		} 
	});

	// If userId is supplied, authenticate and create
	if (req.body.userId) {
		if (req.body.userId !== user.id && user.id !== 14) { return res.status(500).json('Not authorized to update labels for this userId'); }
		authenticateAndUpdate = Label.update(updatedLabel, {
			where: { id: req.body.labelId, userId: req.body.userId },
			individualHooks: true
		});
	}

	// If pubId is supplied, authenticate and create
	if (req.body.pubId) {
		authenticateAndUpdate = Contributor.findOne({
			where: { pubId: req.body.pubId, userId: user.id },
			raw: true,
		})
		.then(function(contributor) {
			if ((!contributor || (!contributor.canEdit && !contributor.isAuthor)) && user.id !== 14) {
				throw new Error('Not Authorized to update labels for this pubId');
			}
			return Label.update(updatedLabel, {
				where: { id: req.body.labelId, pubId: req.body.pubId },
				individualHooks: true
			});
		});
	}

	// If journalId is supplied, authenticate and create
	if (req.body.journalId) {
		authenticateAndUpdate = JournalAdmin.findOne({
			where: { journalId: req.body.journalId, userId: user.id },
			raw: true,
		})
		.then(function(journalAdmin) {
			if (!journalAdmin && user.id !== 14) {
				throw new Error('Not Authorized to update labels for this journalId');
			}

			return Label.update(updatedLabel, {
				where: { id: req.body.labelId, journalId: req.body.journalId },
				individualHooks: true
			});
		});
	}
	
	authenticateAndUpdate
	.then(function(newLabel) {
		return res.status(201).json(true);
	})
	.catch(function(err) {
		console.error('Error in putLabels: ', err);
		return res.status(500).json(err.message);
	});
}
app.put('/label', putLabel);

export function deleteLabel(req, res, next) {
	const user = req.user || {};
	if (Number(!!req.body.userId) + Number(!!req.body.pubId) + Number(!!req.body.journalId) !== 1) { return res.status(500).json('A label must be associated with a single userId, pubId, or journalId'); }

	let authenticateAndUpdate;

	// If userId is supplied, authenticate and create
	if (req.body.userId) {
		if (req.body.userId !== user.id && user.id !== 14) { return res.status(500).json('Not authorized to delete labels for this userId'); }
		authenticateAndUpdate = Label.destroy({
			where: { id: req.body.labelId, userId: req.body.userId },
			individualHooks: true
		});
	}

	// If pubId is supplied, authenticate and create
	if (req.body.pubId) {
		authenticateAndUpdate = Contributor.findOne({
			where: { pubId: req.body.pubId, userId: user.id },
			raw: true,
		})
		.then(function(contributor) {
			if ((!contributor || (!contributor.canEdit && !contributor.isAuthor)) && user.id !== 14) {
				throw new Error('Not Authorized to delete labels for this pubId');
			}
			return Label.destroy({
				where: { id: req.body.labelId, pubId: req.body.pubId },
				individualHooks: true
			});
		});
	}

	// If journalId is supplied, authenticate and create
	if (req.body.journalId) {
		authenticateAndUpdate = JournalAdmin.findOne({
			where: { journalId: req.body.journalId, userId: user.id },
			raw: true,
		})
		.then(function(journalAdmin) {
			if (!journalAdmin && user.id !== 14) {
				throw new Error('Not Authorized to delete labels for this journalId');
			}

			return Label.destroy({
				where: { id: req.body.labelId, journalId: req.body.journalId },
				individualHooks: true
			});
		});
	}
	
	authenticateAndUpdate
	.then(function(newLabel) {
		return res.status(201).json(true);
	})
	.catch(function(err) {
		console.error('Error in putLabels: ', err);
		return res.status(500).json(err.message);
	});
}
app.delete('/label', deleteLabel);
