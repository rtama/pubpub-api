require('./config.js');

// const MongoClient = require('mongodb').MongoClient

// const db = require('monk')()
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI);
const Journal = require('./models').Journal;

// const journals = db.get('journals')

//
// MongoClient.connect(, function(err, db) {
//   if (err){
//     console.log("Error connecting " + err)
//   }
//   console.log("Connected correctly to DB server");
//   db.close();
// });

exports.findAllJournals = function(db, callback) {
  // Get the documents collection
  var collection = db.collection('journals');
  // Find some documents
  collection.find({}).toArray(function(err, docs) {
    if (err){
      console.log("Dammit an error")
    }

    console.log("Found the following records");
    console.dir(docs);
    callback(docs);
  });
}
exports.findJournalBySlug = function(slug, callback) {
  journals.findOne({slug: slug}, ['journalName', 'description', 'collections', 'about', 'website', 'twitter', 'facebook', '-_id'], function(err, journal) {
    if (err){
      console.log("Dammit an error " +err)
      callback(err)
    }
    console.log("Found a journal " + JSON.stringify(journal))

    callback(null, journal);
  });
};
