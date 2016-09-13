import { getFeatured, getCollections, getJournal, getSubmissions, getJournalCollection, featurePub } from './journal-endpoints';
import { getUserByID } from './user-endpoints';
import { submitPub } from './pub-endpoints';

if (process.env.NODE_ENV !== 'production') {
	require('./config');
} else {
	console.log('Production not implemented yet, needs the right vars set, etc')
}

const osprey = require('osprey');
const express = require('express');
const bodyParser = require('body-parser');
const join = require('path').join;

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const path = join(__dirname, 'api.raml');

const mongoose = require('mongoose');
const Journal = require('./models').Journal;
const User = require('./models').User;
const Atom = require('./models').Atom;
const Link = require('./models').Link;
mongoose.Promise = require('bluebird');

mongoose.connect(process.env.MONGO_URI);


osprey.loadFile(path)
.then(function (middleware) {

	app.use(middleware);

	app.all('/*', function(req, res, next) {
		res.header('Access-Control-Allow-Origin', req.headers.origin);
		res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
		res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
		res.header('Access-Control-Allow-Credentials', true);
		next();
	});


	app.use(function (err, req, res, next) {
		// Handle errors.
		console.log('Error! ' + err );
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

	console.log(`Server running on ${process.env.PORT || 9876}`)
	app.listen(process.env.PORT || 9876);
})
.catch(function (error) { console.error('Error: %s', error.message); });
