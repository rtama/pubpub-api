import Promise from 'bluebird';
import app from '../../server';
import { redisClient, Activity, User, Pub, Label, Journal, FollowsPub, FollowsUser, FollowsJournal, FollowsLabel, Contributor, JournalAdmin } from '../../models';

const userAttributes = ['id', 'username', 'firstName', 'lastName', 'image', 'bio'];

const activityFinder = function(type, ids) {
	return Activity.findAll({
		where: {
			$or: [
				{ ['actor' + type + 'Id']: { $in: ids } },
				{ ['target' + type + 'Id']: { $in: ids } },
				{ ['object' + type + 'Id']: { $in: ids } },
			]
		},
		include: [
			{ model: Pub, as: 'actorPub' }, 
			{ model: Pub, as: 'targetPub' }, 
			{ model: Pub, as: 'objectPub' }, 

			{ model: User, as: 'actorUser', attributes: userAttributes }, 
			{ model: User, as: 'targetUser', attributes: userAttributes }, 
			{ model: User, as: 'objectUser', attributes: userAttributes }, 

			{ model: Journal, as: 'actorJournal' }, 
			{ model: Journal, as: 'targetJournal' }, 
			{ model: Journal, as: 'objectJournal' }, 

			{ model: Label, as: 'actorLabel' }, 
			{ model: Label, as: 'targetLabel' }, 
			{ model: Label, as: 'objectLabel' }, 
		]
	});
};

const filterPrivate = function(activities, pubs, journals) {
	// Iterate through all of the activities
	// If the activity has a pub that is private, and the user doesn't own them, remove
	
	const pubsData = pubs || [];
	const pubIds = pubsData.map((pub)=> { return pub.id; });
	// const journalsData = journals || [];
	// const journalIds = journalsData.map((journal)=> { return journal.id; });
	const activitiesData = activities || [];

	return activitiesData.filter((activity)=> {
		const actorPub = activity.actorPub || {};
		const targetPub = activity.targetPub || {};
		const objectPub = activity.objectPub || {};
		if (actorPub.id && !actorPub.isPublished && !pubIds.includes(actorPub.id)) { return false; }
		if (targetPub.id && !targetPub.isPublished && !pubIds.includes(targetPub.id)) { return false; }
		if (objectPub.id && !objectPub.isPublished && !pubIds.includes(objectPub.id)) { return false; }

		return true;
	});

};

export function queryForActivity(userId) {
	return User.findOne({
		where: { id: userId },
		include: [
			{ model: FollowsPub, as: 'FollowsPubs' }, 
			{ model: FollowsUser, as: 'FollowsUsers' }, 
			{ model: FollowsJournal, as: 'FollowsJournals' }, 
			{ model: FollowsLabel, as: 'FollowsLabels' }, 
			// { model: Pub, as: 'pubs', where: { replyRootPubId: null } },
			{ model: Contributor, separate: true, as: 'contributions', include: [{ model: Pub, as: 'pub' }] },
			// { model: Journal, as: 'journals' },
			{ model: JournalAdmin, separate: true, as: 'journalAdmins', include: [{ model: Journal, as: 'journal' }] },
		]
	})
	.then(function(userData) {
		if (!userData) { return [[], {}]; }
		const contributions = userData.contributions || [];
		const journalAdmins = userData.journalAdmins || [];
		const assets = {
			pubs: contributions.map((item)=> { return item.pub; }).filter((item)=> { return item.replyRootPubId === null; }),
			journals: journalAdmins.map((item)=> { return item.journal; }),
		};

		const FollowsPubsIds = userData.FollowsPubs.map((item)=> { return item.pubId; });
		const FollowsJournalsIds = userData.FollowsJournals.map((item)=> { return item.journalId; });
		const FollowsUsersIds = userData.FollowsUsers.map((item)=> { return item.userId; });
		const FollowsLabelsIds = userData.FollowsLabels.map((item)=> { return item.labelId; });

		const myPubsIds = assets.pubs.map((item)=> { return item.id; });
		const myJournalsIds = assets.journals.map((item)=> { return item.id; });

		const findActivities = [
			activityFinder('Pub', FollowsPubsIds),
			activityFinder('Journal', FollowsJournalsIds),
			activityFinder('User', FollowsUsersIds),
			activityFinder('Label', FollowsLabelsIds),
			activityFinder('Pub', myPubsIds),
			activityFinder('Journal', myJournalsIds),
			activityFinder('User', [userId]), // You activities
			// How do we define global activities? We grab top journals, users, and pubs - and populate them?
			// Make on-the-fly following list essentially. We could have global be 'editors pick'
		];
		return [Promise.all(findActivities), assets];
		
	}).spread(function(activitiesData, assets) {
		const output = {
			activities: {
				pubs: filterPrivate(activitiesData[0], assets.pubs, assets.journals),
				journals: filterPrivate(activitiesData[1], assets.pubs, assets.journals),
				users: filterPrivate(activitiesData[2], assets.pubs, assets.journals),
				labels: filterPrivate(activitiesData[3], assets.pubs, assets.journals),
				myPubs: activitiesData[4],
				myJournals: activitiesData[5],
				myUsers: activitiesData[6],
				assets: assets
			},
		};
		return output;
	});
}

export function getActivities(req, res, next) {
	// Get user followsPub, followsUser, followsLabel, followsJournal
	// Get activities of ids that exist in user's Follows
	// Get global activities?

	const user = req.user || {};
	// const assetsInclude = req.query.assets === 'true' 
	// 	? [
	// 		{ model: Pub, as: 'pubs', where: { replyRootPubId: null } },
	// 		{ model: Journal, as: 'journals' },
	// 	]
	// 	: {};

	// console.time('assetQueryTime');
	// User.findOne({
	// 	where: { id: user.id },
	// 	include: [
	// 		{ model: FollowsPub, as: 'FollowsPubs' }, 
	// 		{ model: FollowsUser, as: 'FollowsUsers' }, 
	// 		{ model: FollowsJournal, as: 'FollowsJournals' }, 
	// 		{ model: FollowsLabel, as: 'FollowsLabels' }, 
	// 		// { model: Pub, as: 'pubs', where: { replyRootPubId: null } },
	// 		{ model: Contributor, separate: true, as: 'contributions', include: [{ model: Pub, as: 'pub' }] },
	// 		// { model: Journal, as: 'journals' },
	// 		{ model: JournalAdmin, separate: true, as: 'journalAdmins', include: [{ model: Journal, as: 'journal' }] },
	// 	]
	// })
	// .then(function(userData) {
	// 	if (!userData) { return [[], {}]; }
	// 	const contributions = userData.contributions || [];
	// 	const journalAdmins = userData.journalAdmins || [];
	// 	const assets = {
	// 		pubs: contributions.map((item)=> { return item.pub; }).filter((item)=> { return item.replyRootPubId === null; }),
	// 		journals: journalAdmins.map((item)=> { return item.journal; }),
	// 	};

	// 	const FollowsPubsIds = userData.FollowsPubs.map((item)=> { return item.pubId; });
	// 	const FollowsJournalsIds = userData.FollowsJournals.map((item)=> { return item.journalId; });
	// 	const FollowsUsersIds = userData.FollowsUsers.map((item)=> { return item.userId; });
	// 	const FollowsLabelsIds = userData.FollowsLabels.map((item)=> { return item.labelId; });

	// 	const myPubsIds = assets.pubs.map((item)=> { return item.id; });
	// 	const myJournalsIds = assets.journals.map((item)=> { return item.id; });

	// 	const findActivities = [
	// 		activityFinder('Pub', FollowsPubsIds),
	// 		activityFinder('Journal', FollowsJournalsIds),
	// 		activityFinder('User', FollowsUsersIds),
	// 		activityFinder('Label', FollowsLabelsIds),
	// 		activityFinder('Pub', myPubsIds),
	// 		activityFinder('Journal', myJournalsIds),
	// 		activityFinder('User', [user.id]), // You activities
	// 		// How do we define global activities? We grab top journals, users, and pubs - and populate them?
	// 		// Make on-the-fly following list essentially. We could have global be 'editors pick'
	// 	];
	// 	return [Promise.all(findActivities), assets];
		
	// }).spread(function(activitiesData, assets) {
	// 	const output = {
	// 		activities: {
	// 			pubs: filterPrivate(activitiesData[0], assets.pubs, assets.journals),
	// 			journals: filterPrivate(activitiesData[1], assets.pubs, assets.journals),
	// 			users: filterPrivate(activitiesData[2], assets.pubs, assets.journals),
	// 			labels: filterPrivate(activitiesData[3], assets.pubs, assets.journals),
	// 			myPubs: activitiesData[4],
	// 			myJournals: activitiesData[5],
	// 			myUsers: activitiesData[6],
	// 			assets: assets
	// 		},
	// 	};
	// 	return output;
	// })


	console.time('assetQueryTime');
	redisClient.getAsync('a_' + user.id).then(function(redisResult) {
		if (redisResult) { return redisResult; }
		return queryForActivity(user.id);
	})
	.then(function(activitiesData) {
		if (!activitiesData) { throw new Error('Activities not Found'); }
		const outputData = typeof activitiesData === 'object' ? activitiesData : JSON.parse(activitiesData);
		console.log('Using Cache: ', typeof activitiesData !== 'object');
		const setCache = typeof activitiesData === 'object' ? redisClient.setexAsync('a_' + user.id, 120, JSON.stringify(outputData)) : {};
		return Promise.all([outputData, setCache]);
	})
	.spread(function(activitiesData, setCacheResult) {
		console.timeEnd('assetQueryTime');
		return res.status(201).json({
			...activitiesData,
			assets: req.query.assets === true ? activitiesData.assets : undefined,
		});
	})
	.catch(function(err) {
		console.error('Error in getActivities: ', err);
		return res.status(500).json(err.message);
	});

}
app.get('/activities', getActivities);
