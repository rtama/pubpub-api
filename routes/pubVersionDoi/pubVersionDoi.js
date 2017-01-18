import Promise from 'bluebird';
import request from 'request-promise';
import builder from 'xmlbuilder';
import app from '../../server';
import { Version, Pub, Contributor, User } from '../../models';
import { userAttributes } from '../user/user';

const getFullDate = function(timestamp) {
	const mm = timestamp.getMonth() + 1; // getMonth() is zero-based
	const dd = timestamp.getDate();

	return [timestamp.getFullYear(),
		(mm > 9 ? '' : '0') + mm,
		(dd > 9 ? '' : '0') + dd
	].join('-');
};

export function postVersionDoi(req, res, next) {

	const user = req.user || {};
	if (!user.id) { return res.status(500).json('Not authorized'); }
	if (!req.body.pubId || !req.body.versionId) { return res.status(500).json('pubId and versionId required'); }

	Contributor.findOne({
		where: { userId: user.id, pubId: req.body.pubId },
		raw: true,
	})
	.then(function(contributorData) {
		if (!contributorData || (!contributorData.canEdit && !contributorData.isAuthor)) {
			throw new Error('Not Authorized to update this pub');
		}

		// Check to make sure the version is public 
		// Check to make sure no other versions on this pub have a DOI
		return Version.findAll({
			where: { pubId: req.body.pubId }
		});
	})
	.then(function(versionsData) {
		const selectedVersion = versionsData.reduce((previous, current)=> {
			if (current.doi) { throw new Error('Pub already has a version with a DOI'); }
			if (current.id === req.body.versionId && !current.isPublished) { throw new Error('Version must be public to assign DOI'); }
			if (current.id === req.body.versionId) { return current; }
			return previous;
		}, undefined);
		if (!selectedVersion) { throw new Error('versionId not associated with this pubId'); }
		
		const getPub = Pub.findOne({
			where: { id: req.body.pubId },
			include: [
				{ model: Contributor, as: 'contributors', include: [{ model: User, as: 'user', attributes: userAttributes }] }, 
			]
		});
		return Promise.all([selectedVersion, getPub]);
	})
	.spread(function(selectedVersion, pubData) {
		const dataciteXmlObject = {
			resource: {
				'@xmlns': 'http://datacite.org/schema/kernel-3',
				'@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
				'@xsi:schemaLocation': 'http://datacite.org/schema/kernel-3 http://schema.datacite.org/meta/kernel-3/metadata.xsd',
				identifier: {
					'@identifierType': 'DOI',
					'#text': '10.5072/example',
				},
				creators: {
					creator: ()=> {
						return pubData.contributors.map((contributor)=> {
							const userData = contributor.user || {};
							let name;
							if (!userData.lastName) { name = userData.firstName; }
							if (!userData.firstName) { name = userData.lastName; }
							if (userData.lastName && userData.firstName) { name = userData.lastName + ', ' + userData.firstName; }
							return { 
								creatorName: name,
								nameIdentifier: {
									'@schemeURI': 'https://www.pubpub.org',
									'@nameIdentifierScheme': 'PubPub',
									'#text': userData.id
								},
								affiliation: 'None'
							};
						});
					}
				},
				titles: {
					title: {
						'@xml:lang': 'en-us',
						'#text': pubData.title
					}
				},
				publisher: 'PubPub',
				publicationYear: new Date(selectedVersion.createdAt).getFullYear(),
				dates: {
					date: {
						'@dateType': 'Updated',
						'#text': getFullDate(selectedVersion.createdAt)
					}
				},
				language: 'en-us',
				resourceType: {
					'@resourceTypeGeneral': 'Other',
					'#text': 'pub',
				},
				descriptions: {
					description: {
						'@xml:lang': 'en-us',
						'@descriptionType': 'Other',
						'#text': pubData.description
					}	
				}
				
			}
		};
		const dataCiteXmlString = builder.create(dataciteXmlObject, { headless: true }).end({ pretty: true });
		// return dataCiteXmlString;
		return request({
			// method: 'POST',
			// uri: 'https://ezid.cdlib.org/shoulder/' + process.env.DOI_SHOULDER,
			method: 'PUT',
			uri: 'https://ezid.cdlib.org/id/' + process.env.DOI_SHOULDER + (pubData.id + 10000),
			headers: {
				Authorization: process.env.DOI_AUTH,
				'Content-Type': 'text/plain',
			},
			body: '' +
				'_profile: datacite\n' +
				'_target: ' + encodeURIComponent('https://v3-dev.pubpub.org/pub/' + pubData.slug) + '\n' +
				'datacite: ' + encodeURIComponent(dataCiteXmlString)
		});
	})
	.then(function(doiResult) {
		const newDoi = doiResult.split('|')[0].replace('success:', '').replace('doi:', '').trim();
		const updateVersion = Version.update({ doi: newDoi }, {
			where: { id: req.body.versionId },
			individualHooks: true,
		});
		return Promise.all([newDoi, updateVersion]);
	})
	.spread(function(newDoi, versionUpdateCount) {
		return res.status(201).json(newDoi);
	})
	.catch(function(err) {
		console.error('Error in postVersionDoi: ', err);
		return res.status(500).json(err.message);
	});
}
app.post('/pub/version/doi', postVersionDoi);
