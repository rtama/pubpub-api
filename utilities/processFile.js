/* eslint-disable no-bitwise */

// TODO: This file needs to be moved to a worker dyno and 
// a simple messaging task queue has to be setup.

import https from 'https';
import Promise from 'bluebird';
import fs from 'fs';
import hashFiles from 'hash-files';
import tmp from 'tmp-promise';
import { uploadLocalFile } from './uploadLocalFile';

const AWS = require('aws-sdk');
AWS.config.region = 'us-east-1';
AWS.config.setPromisesDependency(Promise);

const fsWriteFile = Promise.promisify(fs.writeFile);
tmp.setGracefulCleanup();

const setDelay = function() {
	return new Promise(function(resolve, reject) {
		setTimeout(function() {
			resolve();
		// }, Math.random() * 240 * 1000);
		}, Math.random() * 0 * 1000);
	});
};

const generateAndSaveFile = function(file) {
	// Create a file from file.docJSON, 
	// Upload it, 
	// Change fileUrl (make it a let);
	// then proceed as normal
	const fileUrl = file.url;
	const fileType = file.type;
	const fileContent = file.content;
	const extension = fileUrl ? fileUrl.substr((~-fileUrl.lastIndexOf('.') >>> 0) + 2) : 'jpg';

	return new Promise(function(resolve, reject) {
		if (fileType === 'ppub' && fileUrl === '/temp.ppub' && fileContent) {
			resolve(tmp.file({ postfix: '.' + extension }));
		}
		if (fileType === 'text/markdown' && fileUrl === '/temp.md' && fileContent) {
			resolve(tmp.file({ postfix: '.' + extension }));
		}
		if (fileType === 'application/json' && fileUrl === '/tempHighlights.json' && fileContent) {
			resolve(tmp.file({ postfix: '.' + extension }));
		}
		resolve(null);
	})
	.then(function(object) {
		const storedContent = fileType === 'ppub' ? JSON.stringify(fileContent, null, 2) : fileContent;
		if (object) {
			return fsWriteFile(object.path, storedContent, 'utf-8')
			.then(function() {
				return uploadLocalFile(object.path);
			})
			.catch(function(err) {
				console.log('Error generating and saving file', file, err);
			});
		}
		return null;
	});
};

const uploadToPubPub = function(pathname, fileUrl) {
	return new Promise(function(resolve, reject) {
		if (fileUrl.indexOf('https://assets.pubpub.org') === -1) {
			resolve(uploadLocalFile(pathname));
		} else {
			resolve(null);	
		}
		
	});
};

const generateHash = function(pathname) {
	return new Promise(function(resolve, reject) {
		hashFiles({ files: [pathname] }, function(error, hash) {
			if (error) { reject(error); }
			resolve(hash);
		});
	});
};

const getContent = function(pathname, fileType) {
	return new Promise(function(resolve, reject) {

		if (fileType === 'text/markdown') { 
			fs.readFile(pathname, 'utf8', function (err, data) {
				if (err) { reject(err); }
				resolve(data);
			});
		} else if (fileType === 'ppub') {
			fs.readFile(pathname, 'utf8', function (err, data) {
				if (err) { reject(err); }
				resolve(data);
			});
		} else if (fileType === 'application/x-bibtex') {
			fs.readFile(pathname, 'utf8', function (err, data) {
				if (err) { reject(err); }
				resolve(data);
			});
		} else if (fileType === 'application/json') {
			fs.readFile(pathname, 'utf8', function (err, data) {
				if (err) { reject(err); }
				resolve(data);
			});
		} else {
			resolve(null);
		}
	});
};


export function processFile(file) {
	let fileUrl = file.url;
	const extension = fileUrl ? fileUrl.split('.').pop() : 'jpg';
	let fileType = file.type;
	if (extension === 'md') { fileType = 'text/markdown'; }
	if (extension === 'bib') { fileType = 'application/x-bibtex'; }
	if (extension === 'ppub') { fileType = 'ppub'; }
	if (extension === 'json') { fileType = 'application/json'; }
	
	
	// Grab the file. 
	// If the URL is not a pubpub url, then upload it to pubpub and grab new url
	// Generate the hash
	// If the file is of certain types, pre-generate the content (e.g. grab the markdown)

	return setDelay()
	.then(function() {
		return generateAndSaveFile(file);
	})
	.then(function(newFileUrl) {
		if (newFileUrl) { fileUrl = newFileUrl; }
		return null;
	})
	.then(function() {
		return tmp.file({ postfix: '.' + extension });
	})
	.then(function(object) {
		const pathname = object.path;

		const needsToUploadToPubPub = fileUrl.indexOf('https://assets.pubpub.org') === -1;
		const needsGetContent = fileType === 'text/markdown' || fileType === 'ppub' || fileType === 'application/x-bibtex' || fileType === 'application/json';
		

		if (needsToUploadToPubPub || needsGetContent) {
			return new Promise(function(resolve, reject) {
				const writeFile = fs.createWriteStream(pathname);
				https.get(fileUrl.replace('http://', 'https://'), function(response) {
					response.pipe(writeFile);
					writeFile.on('finish', function() {
						writeFile.close(function() {

							const actionPromises = [];
							if (needsToUploadToPubPub) {
								actionPromises.push(uploadToPubPub(pathname, fileUrl));
							} else {
								actionPromises.push(null);
							}
							if (needsGetContent) {
								actionPromises.push(getContent(pathname, fileType));
							} else {
								actionPromises.push(null);
							}

							// console.log('actionPromises are', actionPromises)

							Promise.all(actionPromises)
							.then(function(results) {
								resolve(results);
							})
							.catch(function(err) {
								reject(err);
							});

							// Promise.all([
							// 	uploadToPubPub(pathname, fileUrl),
							// 	generateHash(pathname),
							// 	getContent(pathname, fileType),
							// ])
							// .then(function(results) {
							// 	resolve(results);
							// });
							
						});

					})
					.on('error', function(err) {
						reject(err);

					});
				}).on('error', (err) => {
					reject(err);
				});
			});
		}
		
		return [];
		
	})
	.then(function(data) {

		const outputData = {
			url: data[0] || fileUrl,
			// hash: data[1] || null,
			content: data[1] || null,
			type: fileType
		};

		const s3bucket = new AWS.S3({ params: { Bucket: 'assets.pubpub.org' } });
		const params = {
			Key: outputData.url.replace('https://assets.pubpub.org/', ''), 
		};

		const getHead = s3bucket.headObject(params).promise();

		return Promise.all([getHead, outputData]);
		// return {
		// 	url: data[0] || fileUrl,
		// 	hash: data[1] || null,
		// 	content: data[2] || null,
		// 	type: fileType
		// };	
	})
	.spread(function(s3HeadData, outputData) {
		// console.log(s3HeadData);
		// console.log('output data is ', outputData)
		return {
			...outputData,
			hash: s3HeadData.ETag,
		};
	})
	.catch(function(err) {
		// console.log('Error in process file', file, err);
		console.log('Error in process file', err);
	});
}
