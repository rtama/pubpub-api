var osprey = require('osprey')
var express = require('express')
var join = require('path').join
var app = express()

var path = join(__dirname, 'assets', 'api.raml')

let users = ['hassan' , 'john']

// Be careful, this uses all middleware functions by default. You might just
// want to use each one separately instead - `osprey.server`, etc.
osprey.loadFile(path)
.then(function (middleware) {
  app.use(middleware)

  app.use(function (err, req, res, next) {
    // Handle errors.
    console.log("An error oh noee " +err + ", " +next)
    next();
  })

  app.post('/users/{id}/', function (req, res, next) {
    console.log("Got a hit son " + req.body.name)

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

  app.listen(9876)
})
.catch(function(e) { console.error("Error: %s", e.message); });
