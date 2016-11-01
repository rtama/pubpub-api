import { getFeatured, getCollections, getJournal, getSubmissions, getJournalCollection, featurePub } from './journal-endpoints';
import { getUserByID } from './user-endpoints';
import { submitPub } from './pub-endpoints';
import { createAtom } from './atom-endpoints';

if (process.env.NODE_ENV !== 'production') {
	require('./config');
} else {
	console.log('Production not implemented yet, needs the right vars set, etc');
}

const osprey = require('osprey');
const express = require('express');
const bodyParser = require('body-parser');
const join = require('path').join;

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const ramlFile = join(__dirname, 'api.raml');

const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

mongoose.connect(process.env.MONGO_URI);


const User = require('./models').User;

/* Function for checking if a user an access a resource*/
function isAllowed(req, res, next) {
	const username = req.user.username;


	next();
}

osprey.loadFile(ramlFile, {
	security: {
		basic_auth: {
			validateUser: function (username, apiKey, done) {
				const query = { $or: [{ accessToken: apiKey }] };
				console.log("Yep query " + query)
				User.findOne(query).lean().exec()
				.then((user) => {
					console.log("did we get a user? " + user.username)
					if (!user || user.username !== username) return done(null, false);

					console.log("authenticated, bro! : D")
					return done(null, user);
				})
				.catch(error => {
					console.log("Error in the basic_auth thing")
					done(error)
				});
			}
		}
	}
})
.then((middleware) => {
	app.use(middleware);

	app.all('/*', (req, res, next) => {
		res.header('Access-Control-Allow-Origin', req.headers.origin);
		res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization');
		res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
		res.header('Access-Control-Allow-Credentials', true);
		next();
	});

	app.use((err, req, res, next) => {
		next();
	});

	/* Route for         */
	/* /user/{username}  */
	/* /user/{id}        */
	app.get('/user/:id/', getUserByID);

	/* Route for         */
	/* /journal/{slug}   */
	/* /journal/{id}     */
	app.get('/journal/:id/', getJournal);

	/* Route for                 		*/
	/* /journal/{slug}/submissions  */
	/* /journal/{id}/submissions    */
	app.get('/journal/:id/submissions/', getSubmissions);

	/* Route for                 */
	/* /journal/{slug}/featured  */
	/* /journal/{id}/featured    */
	app.get('/journal/:id/featured/', getFeatured);

	/* Route for                 */
	/* /journal/{slug}/feature  */
	/* /journal/{id}/feature    */
	app.post('/journal/:id/feature/', featurePub);

	/* Route for                    */
	/* /journal/{slug}/collections  */
	/* /journal/{id}/collections    */
	app.get('/journal/:id/collections/', getCollections);

	/* Route for                                  */
	/* /journal/{slug}/collection/{collectionID}  */
	/* /journal/{id}/collection/{collectionID}    */
	app.get('/journal/:id/collection/:collectionID', getJournalCollection);

	/* Route for  		*/
	/* /pubs/{id}/submit 	*/
	app.post('/pubs/:id/submit', submitPub);

	/* Route for */
	/* /atoms/create */
	app.post('/atom/create', createAtom);

	console.log(`Server running on ${process.env.PORT || 9876}`);
	app.listen(process.env.PORT || 9876);
})
.catch((error) => { console.error('Error: %s', error.message); });
