const osprey = require('osprey')
const express = require('express')
const join = require('path').join
const app = express()

const dbcalls = require('./dbcalls')

const path = join(__dirname, 'assets', 'api.raml')

let users = ['hassan' , 'john']


osprey.loadFile(path)
.then(function (middleware) {

  app.use(middleware)

  app.use(function (err, req, res, next) {
    // Handle errors.
    console.log("Error! " + err + ", " + next)
    next();
  })

  app.get('/users/:id/', function (req, res, next) {
    // console.log("Got a hit son " + req.body.name)
    console.log("ID: " + req.params.id)
    // console.log(req.body.)

    // req.body.on('error', next)

    // req.pipe(req.form)
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
