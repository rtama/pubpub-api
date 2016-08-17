require('./config.js');
const osprey = require('osprey')
const express = require('express')
const join = require('path').join
const app = express()

const dbcalls = require('./dbcalls')

const path = join(__dirname, 'api.raml')

const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
mongoose.connect(process.env.MONGO_URI);
const Journal = require('./models').Journal;
const User = require('./models').User;

osprey.loadFile(path)
.then(function (middleware) {

  app.use(middleware)

  app.use(function (err, req, res, next) {
    // Handle errors.
    console.log("Error! " + err + ", " + next)
    next();
  })

  app.get('/user/:id/', function (req, res, next) {
    // Set the query based on whether the params.id is a valid ObjectID;
    const isValidObjectID = mongoose.Types.ObjectId.isValid(req.params.id);
    const query = isValidObjectID ? { $or:[ {'_id': req.params.id}, {'username': req.params.id} ]} : { 'username': req.params.id };
    
    // Set the parameters we'd like to return
    const select = {_id: 1, username: 1, firstName: 1, lastName: 1, name: 1, image: 1, bio: 1, publicEmail: 1, github: 1, orcid: 1, twitter: 1, website: 1, googleScholar: 1};
    
    // Make db call
    User.findOne(query, select).lean().exec()
    .then(function(userResult) {
      if (!userResult) { throw new Error('User not found'); }
      
      return res.status(200).json(userResult);
    })
    .catch(function(error) {
      return res.status(404).json('User not found');
    });
  })

  app.get('/users/', function (req, res, next) {
    res.setHeader('Content-Type', 'application/json')
    res.send('{ "Yo" : "' + users + '"}')
    // req.form.on('error', next)
  })

  app.post('/users/new/', function (req, res, next) {
    console.log("Got a hit son new user " + req.body.name)

    // console.log(req.body.)

    // req.body.on('error', next)

    // req.pipe(req.form)
  })

  app.get('/journals/', function (req, res, next) {
    res.setHeader('Content-Type', 'application/json')
    dbcalls.findAllJournals(function(){

    })
    res.send('{ "Yo" : "' + users + '"}')
    // req.form.on('error', next)
  })

  app.get('/journal/:slug', function (req, res, next) {
    res.setHeader('Content-Type', 'application/json')
    dbcalls.findJournal(req.params.slug, function(err, journal){
      console.log("A journal " + journal + " err? " + err)
      if (err || !journal){
        console.log("An err")
        res.status(404).send({error: err || "Not found"});
      } else {
        res.send(journal)
      }
    })
  })

    app.get('/journal/:slug/collections/', function (req, res, next) {
      res.setHeader('Content-Type', 'application/json')
      dbcalls.findJournalCollections(req.params.slug, function(err, collections){
        if (err || !collections){
          res.status(404).send({error: err || "Not found"});
        } else {
          res.send(collections)
        }
      })
    })

  app.listen(9876)
})
.catch(function(e) { console.error("Error: %s", e.message); });
