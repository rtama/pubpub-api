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

const path = join(__dirname, 'api.raml');

const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

mongoose.connect(process.env.MONGO_URI);


// osprey.security(path, {
//   basic_auth: {
//     validateUser: function (username, password, done) {
// 			console.log("Swoop")
//       User.findOne({ username: username }, function (err, user) {
//         if (err) { return done(err) }
//         if (!user) { return done(null, false) }
//         if (!user.verifyPassword(password)) { return done(null, false) }
//         return done(null, user)
//       })
//     }
//   }
// })

const User = require('./models').User;

osprey.loadFile(path, {
	security: {
		basic_auth: {
			validateUser: function (username, api_key, done) {
				const query = { $or: [{ accessToken: api_key }] };
				User.findOne(query).lean().exec()
				.then((user) => {
					if (!user || user.username != username) return done(null, false)

					return done(null, true)
				});
			}
		}
	}
	// security: {
	// 	basic_auth: function (auth_info, auth_type) {
	// 		return { handler: handler }
	// 	}
	// }
})
.then((middleware) => {

	app.use(middleware);
	// app.use(osprey.security(middleware, {
	// 	basic: {
	// 		validateUser: function (username, password, done) {
	// 			console.log("Hit")
	// 			if (users[username] && users[username].password === password) {
	// 				return done(null, true)
	// 			}
	// 			return done(null, false)
	// 		}
	// 	},
	// })
	// )


	app.all('/*', (req, res, next) => {
		res.header('Access-Control-Allow-Origin', req.headers.origin);
		res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization');
		res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
		res.header('Access-Control-Allow-Credentials', true);
		next();
	});


	app.use((err, req, res, next) => {
		// Handle errors.
		console.log(err);
		next();
	});

	// app.use((req, res, next) => {
	// 	console.log(JSON.stringify(req.headers))
	// 	const b64string = /* whatever */;
	// 	const buf = Buffer.from(b64string, 'base64');
	//   if (objUser === undefined || objUser.name !== "john" || objUser.pass !== "1234") {
	//       res.set("WWW-Authenticate", "Basic realm=Authorization Required")
	//       res.status(401).end()
	//   } else { next() }
	// })


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

	app.get('/test', function(req, res){
		console.log("Hit test");
		res.end("Dammit")
	})

	console.log(`Server running on ${process.env.PORT || 9876}`);
	app.listen(process.env.PORT || 9876);
})
.catch((error) => { console.error('Error: %s', error.message); });
