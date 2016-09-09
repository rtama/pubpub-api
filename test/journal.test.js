import {getJournalByID} from '../journal-endpoints';

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
});
