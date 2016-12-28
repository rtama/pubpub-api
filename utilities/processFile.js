/* eslint-disable no-bitwise */

// TODO: This file needs to be moved to a worker dyno and 
// a simple messaging task queue has to be setup.

import https from 'https';
import fs from 'fs';
import hashFiles from 'hash-files';
import Promise from 'bluebird';
import tmp from 'tmp-promise';
import { uploadLocalFile } from './uploadLocalFile';

tmp.setGracefulCleanup();


const uploadToPubPub = function(pathname, fileUrl) {
	return new Promise(function(resolve, reject) {
		if (fileUrl.indexOf('https://assets.pubpub.org') === 0) {
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
		} else {
			resolve(null);
		}
	});
};


export function processFile(file) {
	const fileUrl = file.url;
	const fileType = file.type;
	const extension = fileUrl !== undefined ? fileUrl.substr((~-fileUrl.lastIndexOf('.') >>> 0) + 2) : 'jpg';
	// Grab the file. 
	// If the URL is not a pubpub url, then upload it to pubpub and grab new url
	// Generate the hash
	// If the file is of certain types, pre-generate the content (e.g. grab the markdown)
	
	return tmp.file({ postfix: '.' + extension })
	.then(function(object) {
		const pathname = object.path;

		return new Promise(function(resolve, reject) {
			const writeFile = fs.createWriteStream(pathname);
			https.get(fileUrl, function(response) {
				response.pipe(writeFile);
				writeFile.on('finish', function() {
					writeFile.close(function() {

						Promise.all([
							uploadToPubPub(pathname, fileUrl),
							generateHash(pathname),
							getContent(pathname, fileType),
						])
						.then(function(results) {
							resolve(results);
						});
						
					});

				});
			});
		});
	})
	.then(function(data) {
		return {
			url: data[0] || fileUrl,
			hash: data[1] || null,
			content: data[2] || null,
		};	
	});
}
