import Promise from 'bluebird';
import app from '../../server';
import { Activity, User, Pub, Label, Journal, FollowsPub, FollowsUser, FollowsJournal, FollowsLabel } from '../../models';

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
export function getActivities(req, res, next) {
	// Get user followsPub, followsUser, followsLabel, followsJournal
	// Get activities of ids that exist in user's Follows
	// Get global activities?

	const user = req.user || {};
	const assetsInclude = req.query.assets === 'true' 
		? [
			{ model: Pub, as: 'pubs', where: { replyRootPubId: null } },
			{ model: Journal, as: 'journals' },
		]
		: {};

	// console.time('assetQueryTime');
	User.findOne({
		where: { id: user.id },
		include: [
			{ model: FollowsPub, as: 'FollowsPubs' }, 
			{ model: FollowsUser, as: 'FollowsUsers' }, 
			{ model: FollowsJournal, as: 'FollowsJournals' }, 
			{ model: FollowsLabel, as: 'FollowsLabels' }, 
			...assetsInclude
		]
	})
	.then(function(userData) {
		if (!userData) { return [[], {}]; }
		const assets = {
			pubs: userData.pubs,
			journals: userData.journals,
		};

		const FollowsPubsIds = userData.FollowsPubs.map((item)=> { return item.pubId; });
		const FollowsJournalsIds = userData.FollowsJournals.map((item)=> { return item.journalId; });
		const FollowsUsersIds = userData.FollowsUsers.map((item)=> { return item.userId; });
		const FollowsLabelsIds = userData.FollowsLabels.map((item)=> { return item.labelId; });

		const findActivities = [
			activityFinder('Pub', FollowsPubsIds),
			activityFinder('Journal', FollowsJournalsIds),
			activityFinder('User', FollowsUsersIds),
			activityFinder('Label', FollowsLabelsIds),
			activityFinder('User', [user.id]), // You activities
			// How do we define global activities? We grab top journals, users, and pubs - and populate them?
			// Make on-the-fly following list essentially. We could have global be 'editors pick'
		];

		return [Promise.all(findActivities), assets];
		
	})
	.spread(function(activitiesData, assets) {
		const output = {
			activities: {
				pubs: activitiesData[0],
				journals: activitiesData[1],
				users: activitiesData[2],
				labels: activitiesData[3],
				you: activitiesData[4]
			},
		};

		if (req.query.assets === 'true') { output.assets = assets; }
		// console.timeEnd('assetQueryTime');
		return res.status(201).json(output);
	})
	.catch(function(err) {
		console.error('Error in getActivities: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/activities', getActivities);
