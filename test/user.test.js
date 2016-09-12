const assert = require('assert');
// var server = require('../server/app');

const chai = require('chai');
const chaiHttp = require('chai-http');

const url = 'http://localhost:9876';
chai.use(chaiHttp);

describe('/user/:id/', function () {
  this.timeout(15000);
  it('should get the user by a given ID', function (done) {
    chai.request(url)
    .get('/user/576bf659c8dade3700266c17')
    .end(function(err, res){
      assert.equal(res.status, 200);
      done();
    });
  });
  it('should return 404 for non-existent ID', function (done) {
    chai.request(url)
    .get('/user/abcd')
    .end(function(err, res){
      assert.equal(res.status, 404);
      done();
    });
  });
});
