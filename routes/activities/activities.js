import app from '../../server';
import { Activity, User, Pub, Label, Journal } from '../../models';

const userAttributes = ['id', 'username', 'firstName', 'lastName', 'image', 'bio'];

export function getActivities(req, res, next) {
	
	const user = req.user || {};
	return res.status(201).json('hey!');
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
		attributes: ['id', 'title', 'color', 'journalId', 'userId', 'pubId'],
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
		console.error('Error in getActivities: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/activities', getActivities);
