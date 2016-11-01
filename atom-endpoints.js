import { BadRequest } from './errors';

const ObjectID = require('mongodb').ObjectID;
const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

const User = require('./models').User;
const Atom = require('./models').Atom;
const Link = require('./models').Link;
const Version = require('./models').Version;

const request = require('superagent-promise')(require('superagent'), Promise);

const validUrl = require('valid-url');

// Workrs for Images, Juypter and PDF's
export function createAtom(req, res, next) {
	const query = { $or: [{ accessToken: req.body.accessToken }] };
	const url = req.body.url;
	const versionContent = url ? {
		url: url
	} : undefined;

	User.findOne(query).lean().exec()
	.then((user) => {
		if (!user || !req.body.accessToken || !user.verifiedEmail
			|| !req.body.url || !validUrl.isUri(url)) {
				console.log("Haha bad requst " + req.body.url +' ' +validUrl.isUri(url) + '' + req.body.accessToken)
			throw new BadRequest();
		}

		const userID = user._id;
		const now = new Date().getTime();
		const type = req.body.type || 'image';
		const newAtomID = new ObjectID();
		const today = new Date();
		const dateString = (today + '').substring(4, 15);

		const atom = new Atom({
			_id: newAtomID,
			slug: newAtomID,
			title: req.body.title || `New Pub: ${dateString}`,
			type: type,

			createDate: now,
			lastUpdated: now,
			isPublished: false,

			versions: [],
			tags: [],
		});
		atom.previewImage = 'https://assets.pubpub.org/_site/pub.png';
		let versionID;

		atom.save() // Save new atom data
		.then((newAtom) => { // Create new Links pointing between atom and author
			const tasks = [
				Link.createLink('author', userID, newAtomID, userID, now),
			];

			// If there is version data, create the version!
			if (versionContent) {
				const newVersion = new Version({
					type: newAtom.type,
					message: '',
					parent: newAtom._id,
					content: versionContent
				});
				tasks.push(newVersion.save());
			}

			return Promise.all(tasks);
		})
		.then((taskResults) => { // If we created a version, make sure to add that version to parent
			if (taskResults.length === 2) {
				const versionData = taskResults[1];
				versionID = versionData._id;
				return Atom.update({ _id: versionData.parent }, { $addToSet:
					{ versions: versionData._id } }).exec();
			}

			return undefined;
		})
		.then(() => {
			if (type !== 'jupyter') { return undefined; }
			return request.post('http://jupyter-dd419b35.e87eb116.svc.dockerapp.io/convert').send({ form: { url: url } });
		})
		.then((response) => {

			if (type !== 'docx') { return [response]; }
			return [response, request.post('http://localhost:2001/convertdocx').send({ form: { url: url } }), 0];
		})
		.then((result) => {
			const jupyter = result[0];
			const docx = result[1] ? result[1] : undefined;

			if (type === 'jupyter') {
				return Version.update({ _id: versionID }, { $set: { 'content.htmlUrl': jupyter } }).exec();
			} else if (type === 'docx') {
				return Version.update({ _id: versionID }, { $set: { 'content.markdown': docx.markdown } }).exec();
			}
			// newVersion.content.htmlUrl = response;
			return undefined;
		})
		.then(() => {
			const getVersion = Version.findOne({ _id: versionID }).lean().exec();
			const getContributors = Link.find({ destination: newAtomID, type: { $in: ['author', 'editor', 'reader', 'contributor'] }, inactive: { $ne: true } }).populate({
				path: 'source',
				model: User,
				select: 'username name image bio',
			}).exec();
			return Promise.all([getVersion, getContributors]);
		})
		.then((promiseTasks) => { // Return hash of new atom

			const newVersion = promiseTasks[0];
			const contributors = promiseTasks[1];

			const versionData = newVersion || {};
			versionData.parent = atom;
			versionData.contributors = contributors;
			versionData.permissionType = 'author';

			return res.status(200).json(versionData);
		});
	})
	.catch(error => res.status(error.status || 500).json(error.message || 'Internal Server Error'));

}
