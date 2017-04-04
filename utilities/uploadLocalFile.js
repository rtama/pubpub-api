/* eslint-disable no-bitwise */
const Promise = require('bluebird');
const AWS = require('aws-sdk');
AWS.config.region = 'us-east-1';
AWS.config.setPromisesDependency(Promise);
const readFile = Promise.promisify(require('fs').readFile);

function generateFolderName() {
	let folderName = '';
	const possible = 'abcdefghijklmnopqrstuvwxyz';
	for (let charIndex = 0; charIndex < 8; charIndex++) { folderName += possible.charAt(Math.floor(Math.random() * possible.length)); }	
	return folderName;
}

export function uploadLocalFile(filePath) {
	const folderName = process.env.IS_PRODUCTION_API === 'TRUE'
		? generateFolderName() 
		: '_testing';
		
	const extension = filePath !== undefined ? filePath.substr((~-filePath.lastIndexOf('.') >>> 0) + 2) : 'jpg';
	// const filename = folderName + '/' + new Date().getTime() + '.' + extension;
	const filename = folderName + '/' + (Math.floor(Math.random() * 8)) + new Date().getTime() + '.' + extension;

	return readFile(filePath)
	.then(function(file) {
		const s3bucket = new AWS.S3({ params: { Bucket: 'assets.pubpub.org' } });
		const params = {
			Key: filename, 
			Body: file,
			ACL: 'public-read',
		};
		return s3bucket.putObject(params).promise();
	})
	.then(function(result) {
		return 'https://assets.pubpub.org/' + filename;
	})
	.catch(function(error) {
		console.log('Error uploading data: ', error);
	});
}
