import passport from 'passport';
// import cookie from 'cookie';
// import languageParser from 'accept-language-parser';
// import Promise from 'bluebird';
import app from '../../server';
import { User, Pub, Contributor, Journal, JournalAdmin } from '../../models';

// const readFile = Promise.promisify(require('fs').readFile);
// const acceptedLanguages = ['en', 'es'];

export function login(req, res) {
	// let locale = 'en';
	// const languageHeaders = req.headers ? (req.headers['accept-language'] || '') : '';
	// const userLanguages = languageParser.parse(languageHeaders).map(function(language) {
	// 	return language.code;
	// });
	// const cookieHeaders = req.get ? (req.get('cookie') || '') : '';
	// const cookieLocale = cookie.parse(cookieHeaders).lang;

	// // Get the language code for the first laguage that we share with
	// for (let index = 0; index < userLanguages.length; index++) {
	// 	if (acceptedLanguages.indexOf(userLanguages[index]) !== -1) {
	// 		locale = userLanguages[index];
	// 		break;
	// 	}
	// }

	// // if user explicitly set language, use that
	// if (cookieLocale) {
	// 	locale = cookieLocale;
	// }

		// Load the app language data and login the user if a login cookie exists
	// const loginData = req.user
	// 	? {
	// 		_id: req.user._id,
	// 		name: req.user.name,
	// 		firstName: req.user.firstName,
	// 		lastName: req.user.lastName,
	// 		username: req.user.username,
	// 		image: req.user.image,
	// 		settings: req.user.settings,
	// 		following: req.user.following,
	// 		assets: req.user.assets,
	// 		locale: locale,
	// 		verifiedEmail: req.user.verifiedEmail,
	// 		bio: req.user.bio,
	// 		publicEmail: req.user.publicEmail,
	// 		website: req.user.website,
	// 		github: req.user.github,
	// 		orcid: req.user.orcid,
	// 		twitter: req.user.twitter,
	// 		googleScholar: req.user.googleScholar,
	// 		featuredAtoms: req.user.featuredAtoms,
	// 	}
	// 	: {};
	// // const locale = loginData.locale || 'en';

	// const tasks = [
	// 	readFile(__dirname + '/../../translations/languages/' + locale + '.json', 'utf8'), // Load the language data
	// 	Notification.find({recipient: loginData._id, read: false}).count().exec() // Query for the notifcation count
	// ];

	// // Run all tasks and return app and login data
	// Promise.all(tasks).then(function(results) {
	// 	const languageObject = JSON.parse(results[0]);
	// 	const notificationCount = results[1];

	// 	return res.status(201).json({
	// 		languageData: {
	// 			locale: locale,
	// 			languageObject: languageObject,
	// 		},
	// 		loginData: {
	// 			...loginData,
	// 			notificationCount: notificationCount
	// 		}
	// 	});
	// })
	// .catch(function(error) {
	// 	console.log('error', error);
	// 	return res.status(500).json(error);
	// });

	const user = req.user || {};
	User.findOne({ 
		where: { id: user.id },
		include: [
			{ model: Contributor, separate: true, as: 'contributions', include: [{ model: Pub, as: 'pub', where: { replyRootPubId: null }, }] },
			{ model: JournalAdmin, as: 'journalAdmins', include: [{ model: Journal, as: 'journal' }] },
		]
	})
	.then(function(userData) {
		const authenticatedUserAttributes = ['id', 'username', 'firstName', 'lastName', 'image', 'bio', 'publicEmail', 'github', 'orcid', 'twitter', 'website', 'googleScholar', 'email', 'journalAdmins', 'contributions'];
		const loginData = {};
		for (let index = 0; index < authenticatedUserAttributes.length; index++) {
			const key = authenticatedUserAttributes[index];
			loginData[key] = userData[key];
		}
		return res.status(201).json(loginData);
	})
	.catch(function(err) {
		return res.status(500).json(err);
	});

}
app.get('/login', login);
app.post('/login', passport.authenticate('local'), login);
