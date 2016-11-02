const assert = require('assert');
const chai = require('chai');
const chaiHttp = require('chai-http');

const url = 'http://localhost:9876';
chai.use(chaiHttp);

describe.only('POST /atom/createImage/', function () {
	this.timeout(15000);
	it('should create an atom', (done) => {
		chai.request(url)
		.post('/atom/createImage/')
		.auth('hassan_shaikley', '7d368225b521c2328dd3502253c258bdaa2249fe77af5eeebb9e61baf6e9773688fc9d53eb14ea94f2c414670e2fa335')
		.send({ url: 'https://assets.pubpub.org/_site/pub.png' })
		.end((err, res) => {
			assert.equal(res.status, 200);
			done();
		});
	});
	it('requires authorization', (done) => {
		chai.request(url)
		.post('/atom/createImage/')
		.send({})
		.end((err, res) => {
			assert.equal(res.status, 401);
			done();
		});
	});
	it('501s without a given pubpub url -- Only for now until we implement', (done) => {
		chai.request(url)
		.post('/atom/createImage/')
		.auth('hassan_shaikley', '7d368225b521c2328dd3502253c258bdaa2249fe77af5eeebb9e61baf6e9773688fc9d53eb14ea94f2c414670e2fa335')
		.send({})
		.end((err, res) => {
			assert.equal(res.status, 501);
			done();
		});
	});
});
