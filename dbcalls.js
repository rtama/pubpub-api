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
//
// exports.findAllJournals = function(db, callback) {
//   // Get the documents collection
//   var collection = db.collection('journals');
//   // Find some documents
//   collection.find({}).toArray(function(err, docs) {
//     if (err){
//       console.log("Dammit an error")
//     }
//
//     console.log("Found the following records");
//     console.dir(docs);
//     callback(docs);
//   });
// }
//'journalName, description, collections, about, website, twitter, facebook, -_id',
exports.findJournal = function(slug, callback) {
  Journal.findOne({slug: slug},  'journalName -_id description collections about website twitter facebook',function(err, journal) {
    if (err){
      callback(err)
    }

    callback(null, journal);
  });
};

exports.findJournalCollections = function(slug, callback) {
  Journal.findOne({slug: slug})
  .populate({path: 'collections'}) //, select: 'name firstName lastName username thumbnail'
  .exec(function(err, journal) {
    if (err){
      callback(err)
    }

    callback(null, journal);
  });
};
