import { redisClient } from '../models';
import { queryForPub } from '../routes/pub/pub';
import { queryForUser } from '../routes/user/user';
import { queryForJournal } from '../routes/journal/journal';
import { queryForLabel } from '../routes/labels/labels';


// cacheQueueValue: 
// p_123, pub by id
// p_mypubslug, pub by slug
// u_123, user by id
// u_myusername, user by username
// j_123, journal by id
// j_myusername, journal by name

function updateCache(thing) {
	let query;
	const prefix = thing.split('_')[0];
	const queryTerm = thing.split('_')[1];

	if (prefix === 'p') { query = queryForPub; } 
	if (prefix === 'u') { query = queryForUser; } 
	if (prefix === 'j') { query = queryForJournal; } 
	if (prefix === 'l') { query = queryForLabel; } 
	if (!prefix || !queryTerm || !query) { return false; }
	
	console.log('Starting cache update for ' + thing);
	console.time('Finished cache update for ' + thing);

	query(queryTerm)
	.then(function(queryData) {
		if (!queryData) { return false; }
		let key;
		if (prefix === 'p') { key = queryData.slug; } 
		if (prefix === 'u') { key = queryData.username; } 
		if (prefix === 'j') { key = queryData.slug; } 
		if (prefix === 'l') { key = queryData.title; } 
		return redisClient.setexAsync(key, 60 * 60 * 24, JSON.stringify(queryData.toJSON()));
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

function checkAndRunJob(timeInterval) {
	redisClient.spopAsync('cacheQueue')
	.then(function(popResult) {
		if (popResult) { return updateCache(popResult); }
		return false;
	})
	.then(function() {
		setTimeout(checkAndRunJob.bind(this, timeInterval), timeInterval);
	});
}

console.info('⛏️  Cache Worker Started');
checkAndRunJob(500);

