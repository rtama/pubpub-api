import app from '../../server';
import { Pub, Label, Contributor, JournalAdmin, User } from '../../models';
import { createActivity } from '../../utilities/createActivity';

const userAttributes = ['id', 'username', 'firstName', 'lastName', 'image', 'bio'];

export function getLabels(req, res, next) {
	// Return a single label and the associated pubs

	const whereParams = {};
	Object.keys(req.query).map((key)=> {
		if (['id', 'title', 'journalId', 'userId', 'pubId'].indexOf(key) > -1) {
			whereParams[key] = req.query[key];
		} 
	});

	if (whereParams.title && !whereParams.userId) { whereParams.userId = null; }
	if (whereParams.title && !whereParams.journalId) { whereParams.journalId = null; }
	if (whereParams.title && !whereParams.pubId) { whereParams.pubId = null; }

	// const whereParameters = Object.keys(queryParams).length
	// 	? queryParams
	// 	: { journalId: null, userId: null, pubId: null };

	Label.findOne({
		where: whereParams,
		attributes: ['id', 'title', 'color', 'journalId', 'userId', 'pubId', 'isDisplayed', 'description'],
		include: [
			{ model: Pub, as: 'pubs' },
			{ model: User, as: 'followers', attributes: userAttributes }, 
		],
	})
	.then(function(labelsData) {
		if (!labelsData) { return res.status(500).json('Label not found'); }
		return res.status(201).json(labelsData);
	})
	.catch(function(err) {
		console.error('Error in getLabels: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/labels', getLabels);

export function postLabel(req, res, next) {

	const user = req.user || {};
	if (Number(!!req.body.userId) + Number(!!req.body.pubId) + Number(!!req.body.journalId) !== 1) { return res.status(500).json('A new label must be associated with a single userId, pubId, or journalId'); }

	let authenticateAndCreate;

	// If userId is supplied, authenticate and create
	if (req.body.userId) {
		if (req.body.userId !== user.id) { return res.status(500).json('Not authorized to create a label for this userId'); }
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
			if (!contributor || (!contributor.canEdit && !contributor.isAuthor)) {
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
			if (!journalAdmin) {
				throw new Error('Not Authorized to create a label for this journalId');
			}

			return Label.create({
				journalId: req.body.journalId,
				title: req.body.title,
				color: req.body.color,
				isDisplayed: req.body.isDisplayed,
				description: req.body.description
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
app.post('/labels', postLabel);

export function putLabel(req, res, next) {
	const user = req.user || {};
	if (Number(!!req.body.userId) + Number(!!req.body.pubId) + Number(!!req.body.journalId) !== 1) { return res.status(500).json('A label must be associated with a single userId, pubId, or journalId'); }

	let authenticateAndUpdate;

	const updatedLabel = {};
	Object.keys(req.body).map((key)=> {
		if (['color', 'title', 'description', 'isDisplayed'].indexOf(key) > -1) {
			updatedLabel[key] = req.body[key];
		} 
	});

	// If userId is supplied, authenticate and create
	if (req.body.userId) {
		if (req.body.userId !== user.id) { return res.status(500).json('Not authorized to update labels for this userId'); }
		authenticateAndUpdate = Label.update(updatedLabel, {
			where: { id: req.body.labelId, userId: req.body.userId }
		});
	}

	// If pubId is supplied, authenticate and create
	if (req.body.pubId) {
		authenticateAndUpdate = Contributor.findOne({
			where: { pubId: req.body.pubId, userId: user.id },
			raw: true,
		})
		.then(function(contributor) {
			if (!contributor || (!contributor.canEdit && !contributor.isAuthor)) {
				throw new Error('Not Authorized to update labels for this pubId');
			}
			return Label.update(updatedLabel, {
				where: { id: req.body.labelId, pubId: req.body.pubId }
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
			if (!journalAdmin) {
				throw new Error('Not Authorized to update labels for this journalId');
			}

			return Label.update(updatedLabel, {
				where: { id: req.body.labelId, journalId: req.body.journalId }
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
app.put('/labels', putLabel);

export function deleteLabel(req, res, next) {
	const user = req.user || {};
	if (Number(!!req.body.userId) + Number(!!req.body.pubId) + Number(!!req.body.journalId) !== 1) { return res.status(500).json('A label must be associated with a single userId, pubId, or journalId'); }

	let authenticateAndUpdate;

	// If userId is supplied, authenticate and create
	if (req.body.userId) {
		if (req.body.userId !== user.id) { return res.status(500).json('Not authorized to delete labels for this userId'); }
		authenticateAndUpdate = Label.destroy({
			where: { id: req.body.labelId, userId: req.body.userId }
		});
	}

	// If pubId is supplied, authenticate and create
	if (req.body.pubId) {
		authenticateAndUpdate = Contributor.findOne({
			where: { pubId: req.body.pubId, userId: user.id },
			raw: true,
		})
		.then(function(contributor) {
			if (!contributor || (!contributor.canEdit && !contributor.isAuthor)) {
				throw new Error('Not Authorized to delete labels for this pubId');
			}
			return Label.destroy({
				where: { id: req.body.labelId, pubId: req.body.pubId }
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
			if (!journalAdmin) {
				throw new Error('Not Authorized to delete labels for this journalId');
			}

			return Label.destroy({
				where: { id: req.body.labelId, journalId: req.body.journalId }
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
app.delete('/labels', deleteLabel);
