import Promise from 'bluebird';
import { queryForPub } from '../routes/pub/pub';
if (process.env.NODE_ENV !== 'production') { require('../config.js'); }

const redis = require('redis');
Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

const redisClient = redis.createClient(process.env.REDIS_URL);
redisClient.on('error', function (err) {
	console.log('redisClient Error:  ' + err);
});

console.log(queryForPub);
function updateCache(thing) {
	queryForPub(thing)
	.then(function(pubData) {
		if (!pubData) { throw new Error('No Pub Data found when Updating Cache'); }
		redisClient.setexAsync(pubData.slug, 60 * 60 * 24, JSON.stringify(pubData.toJSON()));
	})
	.then(function() {
		console.log('Done updating cache for: ', thing);
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

