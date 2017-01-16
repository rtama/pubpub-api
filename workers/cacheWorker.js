import { redisClient } from '../models';
import { queryForPub } from '../routes/pub/pub';
import { queryForUser } from '../routes/user/user';
import { queryForJournal } from '../routes/journal/journal';
import { queryForLabel } from '../routes/labels/labels';
import { queryForActivity } from '../routes/activities/activities';


function updateCache(thing) {
	let query;
	const prefix = thing.split('_')[0];
	const queryTerm = thing.split('_')[1];

	if (prefix === 'p') { query = queryForPub; } 
	if (prefix === 'u') { query = queryForUser; } 
	if (prefix === 'j') { query = queryForJournal; } 
	if (prefix === 'l') { query = queryForLabel; } 
	if (prefix === 'a') { query = queryForActivity; } 
	if (!prefix || !queryTerm || !query) { return false; }
	
	console.log('Starting cache update for ' + thing);
	console.time('Finished cache update for ' + thing);

	query(queryTerm)
	.then(function(queryData) {
		if (!queryData) { return false; }
		let key;
		if (prefix === 'p') { key = 'p_' + queryData.slug; } 
		if (prefix === 'u') { key = 'u_' + queryData.username; } 
		if (prefix === 'j') { key = 'j_' + queryData.slug; } 
		if (prefix === 'l') { key = 'l_' + queryData.title; } 
		if (prefix === 'a') { key = 'a_' + queryData.id; } 
		return redisClient.setexAsync(key, 120, JSON.stringify(queryData.toJSON()));
	})
	.then(function() {
		console.timeEnd('Finished cache update for ' + thing);
		return redisClient.spopAsync('cacheQueue');	
	})
	.then(function(popResult) {
		if (popResult) { return updateCache(popResult); }
		return true;
	})
	.catch(function(err) {
		console.log('Err: ', err);
	});
}

function checkAndRunJob() {
	redisClient.spopAsync('cacheQueue')
	.then(function(popResult) {
		if (popResult) { return updateCache(popResult); }
		return false;
	})
	.then(function() {
		setTimeout(checkAndRunJob.bind(this, 500), 500);
	});
}

checkAndRunJob();
console.info('⛏️  Cache Worker Started');
