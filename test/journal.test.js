const assert = require('assert');
// var server = require('../server/app');

const chai = require('chai');
const chaiHttp = require('chai-http');

const url = 'http://localhost:9876';
chai.use(chaiHttp);

describe('/journal/:id/', function () {
  this.timeout(15000);
  it('should get the journal by a given ID', function (done) {
    chai.request(url)
    .get('/journal/576c0561c8dade3700266c25')
    .end(function(err, res){
      assert.equal(res.status, 200);
      done();
    });
  });
  it('should get the journal by a given slug', function (done) {
    chai.request(url)
    .get('/journal/absurd')
    .end(function(err, res){
      assert.equal(res.status, 200);
      done();
    });
  });
  it('should 400 for a non existent ID/slug', function (done) {
    chai.request(url)
    .get('/journal/abcd001010101010999')
    .end(function(err, res) {

      assert.equal(res.status, 400);
      done();
    });
  });
  it('should return journal data when fetched ', function (done) {
    chai.request(url)
    .get('/journal/576c0561c8dade3700266c25')
    .end(function(err, res){
      const journalName = JSON.parse(res.text).journalName
      assert.equal(journalName, "Journal of Absurd Ideas");
      done();
    });
  });
});

describe('/journal/:id/featured', function () {
  it('should return featured journal data', function (done) {
    chai.request(url)
    .get('/journal/576c0561c8dade3700266c25/featured')
    .end(function(err, res){

      assert.equal(res.status, 200);
      done();
    });
  });
});

describe('/journal/:id/collections', function () {
  it('returns the collections belonging to a journal', function (done) {
    chai.request(url)
    .get('/journal/576c0561c8dade3700266c25/collections')
    .end(function(err, res){

      const collectionData = JSON.parse(res.text).collections[0].title
      assert.equal(collectionData, 'bat');
      done();
    });
  });
});

describe('/journal/:id/collection/:collectionID', function () {
  it('returns a specific collection belonging to a journal', function(done) {
    chai.request(url)
    .get('/journal/576c0561c8dade3700266c25/collection/57d33558cf284eea2d714e77')
    .end(function(err, res){
      const collectionData = JSON.parse(res.text).title
      assert.equal(collectionData, 'bat');
      done();
    });
  });
});

describe('/journal/:id/submissions', function () {
  it('returns the submissions belonging to a journal by ID', function (done) {
    chai.request(url)
    .get('/journal/576c0561c8dade3700266c25/submissions')
    .query({accessToken: '7d368225b521c2328dd3502253c258bdaa2249fe77af5eeebb9e61baf6e9773688fc9d53eb14ea94f2c414670e2fa335'})
    .end(function(err, res){
      assert.equal(res.status, 200);
      done();
    });
  });

  it('returns the submissions belonging to a journal by slug', function (done) {
    chai.request(url)
    .get('/journal/absurd/submissions')
    .query({accessToken: '7d368225b521c2328dd3502253c258bdaa2249fe77af5eeebb9e61baf6e9773688fc9d53eb14ea94f2c414670e2fa335'})
    .end(function(err, res){
      assert.equal(res.status, 200);
      done();
    });
  });
  it('400s on an invalid id', function (done) {
    chai.request(url)
    .get('/journal/2d368225b521c2328dd3501253c258bdaa2249fe77af5eeebb9e61baf6e9773688fc9d53eb14ea94f2c414670e2fa335/submissions')
    .query({accessToken: '2d368225b521c2328dd3501253c258bdaa2249fe77af5eeebb9e61baf6e9773688fc9d53eb14ea94f2c414670e2fa335'})
    .end(function(err, res){
      assert.equal(res.status, 400);
      done();
    });
  });
  it('400s on missing access token', function (done) {
    chai.request(url)
    .get('/journal/2d368225b521c2328dd3501253c258bdaa2249fe77af5eeebb9e61baf6e9773688fc9d53eb14ea94f2c414670e2fa335/submissions')
    .end(function(err, res){
      assert.equal(res.status, 400)
      done();
    });
  });
});


describe('POST /journal/:id/feature/', function () {
  this.timeout(15000);
  it('should 304 on already featured pubs', function (done) {
    chai.request(url)
    .post('/journal/576c0561c8dade3700266c25/feature')
    .send({accept: "true", atomID: '578fa2ba8099de3700eba17d', accessToken: '7d368225b521c2328dd3502253c258bdaa2249fe77af5eeebb9e61baf6e9773688fc9d53eb14ea94f2c414670e2fa335'})
    // .field('journalID', '576c0561c8dade3700266c25')
    // .field('accessToken', '7d368225b521c2328dd3502253c258bdaa2249fe77af5eeebb9e61baf6e9773688fc9d53eb14ea94f2c414670e2fa335')
    .end(function (err, res) {
       console.log("hi" +JSON.stringify(res))
      assert.equal(res.status, 304);
      done();
    });
  });
});