const assert = require('assert');
const chai = require('chai');
const chaiHttp = require('chai-http');
const ObjectID = require('mongodb').ObjectID;

const url = 'http://localhost:9876';

chai.use(chaiHttp);

describe('POST /pubs/:id/submit', function () {
  this.timeout(15000);
  it('submit a pub to a journal', function (done) {
    chai.request(url)
    .post('/pubs/578fa2ba8099de3700eba17d/submit')
    .send({journalID: new ObjectID()})
    .auth('hassan_shaikley', '7d368225b521c2328dd3502253c258bdaa2249fe77af5eeebb9e61baf6e9773688fc9d53eb14ea94f2c414670e2fa335')
    .end(function (err, res) {
      assert.equal(res.status, 200);
      done();
    });
  });
  it('journalID must be an ObjectID', function (done) {
    chai.request(url)
    .post('/pubs/578fa2ba8099de3700eba17d/submit')
    .send({journalID: 'hi'})
    .auth('hassan_shaikley', '7d368225b521c2328dd3502253c258bdaa2249fe77af5eeebb9e61baf6e9773688fc9d53eb14ea94f2c414670e2fa335')
    .end(function (err, res) {
      assert.equal(res.status, 400);
      done();
    });
  });
  it('304 on already submitted pub', function (done) {
    chai.request(url)
    .post('/pubs/578fa2ba8099de3700eba17d/submit')
    .auth('hassan_shaikley', '7d368225b521c2328dd3502253c258bdaa2249fe77af5eeebb9e61baf6e9773688fc9d53eb14ea94f2c414670e2fa335')
    .send({journalID: '576c0561c8dade3700266c25'})
    .end(function (err, res) {
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
