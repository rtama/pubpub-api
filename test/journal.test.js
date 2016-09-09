const assert = require('assert');
// var server = require('../server/app');

const chai = require('chai');
const chaiHttp = require('chai-http');
const url = 'http://localhost:9876';
chai.use(chaiHttp);


describe('/journal/:id/', function() {
  this.timeout(15000);
  it('should get the journal by a given ID', function(done) {
    chai.request(url)
    .get('/journal/576c0561c8dade3700266c25')
    .end(function(err, res){
      assert.equal(res.status, 200);
      done();
    });
  });
  it('should get the journal by a given slug', function(done) {
    chai.request(url)
    .get('/journal/absurd')
    .end(function(err, res){
      assert.equal(res.status, 200);
      done();
    });
  });
  it('should 404 for a non existent ID/slug', function(done) {
    chai.request(url)
    .get('/journal/abcd001010101010999')
    .end(function(err, res){

      assert.equal(res.status, 404);
      done();
    });
  });
  it('should return journal data when fetched ', function(done) {
    chai.request(url)
    .get('/journal/576c0561c8dade3700266c25')
    .end(function(err, res){
      const journalName = JSON.parse(res.text).journalName
      assert.equal(journalName, "Journal of Absurd Ideas");
      done();
    });
  });
});

describe('/journal/:id/featured', function() {
  it('should return featured journal data', function(done) {
    chai.request(url)
    .get('/journal/576c0561c8dade3700266c25/featured')
    .end(function(err, res){
      // console.log("Hii " + JSON.stringify(res))
      // const journalName = JSON.parse(res.text).journalName
      assert.equal(res.status, 200);
      done();
    });
  });
});

describe('/journal/:id/collections', function() {
  it('returns the collections belonging to a journal', function(done) {
    chai.request(url)
    .get('/journal/576c0561c8dade3700266c25/collections')
    .end(function(err, res){
      // console.log("Hii " + JSON.stringify(res))
      // Admittedly this is not the best test! I am assuming
      // The collections wont change
      const collectionData = JSON.parse(res.text).collections[0].title
      assert.equal(collectionData, 'bat');
      done();
    });
  });
});
