# Workers

Worker file run on separate servers are run processing jobs that are too intensive or long-lived for typical RESTful API queries.

## Cache Worker

Many GET endpoints leverage a redis cache to speed up response times and reduce load on the Postgres server. When no cache exists, a route (e.g. `GET /pub`) will query the database and store the result in the redis cache by itself. However, certain routes may update the data associated with a pub (e.g. `POST pub/contributors`) requiring that the cache be invalidated or updated. 

We use the same redis database to store a Set of ids and slugs that need their caches updated. Routes that modify more complex GET requests (like adding a contributor or a new version) can simply add the value of the Pub (or whatever the parent item is: journal, user, etc) to the Set. Workers that are executing `cacheWorker.js` will monitor this Set and update the cache of the items in it.

For example, a route that is adding a contributor to a Pub which has an id of `27` can call the following before it returns:

```js
redisClient.saddAsync('cacheQueue', 'p_27');
```

Accepted key formats are as follows:
```js
p_123, pub by id
p_mypubslug, pub by slug
u_123, user by id
u_myusername, user by username
j_123, journal by id
j_journaltitle, journal by name
l_123, label by id
l_labeltitle, label by name
a_123, activity for a give user id
```

The cache is typically updated for direct edits (if you update a contributor, the pub it is associated will be updated) - but not updated for secondary joins (if you update your pub's title, we will not update the cache for the journal in which it is featured - thus the journal will have stale results until it's cache expires).