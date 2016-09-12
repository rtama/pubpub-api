const assert = require('assert');
// var server = require('../server/app');

const chai = require('chai');
const chaiHttp = require('chai-http');

const url = 'http://localhost:9876';
const ObjectID = require('mongodb').ObjectID;
chai.use(chaiHttp);

describe('POST /pubs/:id/submit', function () {
  this.timeout(15000);
  it('should submit a pub to a journal', function (done) {
    chai.request(url)
    .post('/pubs/578fa2ba8099de3700eba17d/submit')
    .send({journalID: new ObjectID(), accessToken: '7d368225b521c2328dd3502253c258bdaa2249fe77af5eeebb9e61baf6e9773688fc9d53eb14ea94f2c414670e2fa335'})
    // .field('journalID', '576c0561c8dade3700266c25')
    // .field('accessToken', '7d368225b521c2328dd3502253c258bdaa2249fe77af5eeebb9e61baf6e9773688fc9d53eb14ea94f2c414670e2fa335')
    .end(function (err, res) {
      // console.log("hi" +JSON.stringify(res))
      assert.equal(res.status, 200);
      done();
    });
  });
  it('should 304 on already submitted pubs', function (done) {
    chai.request(url)
    .post('/pubs/578fa2ba8099de3700eba17d/submit')
    .send({journalID: '576c0561c8dade3700266c25', accessToken: '7d368225b521c2328dd3502253c258bdaa2249fe77af5eeebb9e61baf6e9773688fc9d53eb14ea94f2c414670e2fa335'})
    // .field('journalID', '576c0561c8dade3700266c25')
    // .field('accessToken', '7d368225b521c2328dd3502253c258bdaa2249fe77af5eeebb9e61baf6e9773688fc9d53eb14ea94f2c414670e2fa335')
    .end(function (err, res) {
      // console.log("hi" +JSON.stringify(res))
      assert.equal(res.status, 304);
      done();
    });
  });
  // it('should return 404 for non-existent ID', function (done) {
  //   chai.request(url)
  //   .get('/user/abcd')
  //   .end(function(err, res){
  //     assert.equal(res.status, 404);
  //     done();
  //   });
  // });
});
