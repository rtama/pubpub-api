require('./config.js');

const MongoClient = require('mongodb').MongoClient


MongoClient.connect(process.env.MONGO_URI, function(err, db) {
  if (err){
    console.log("Error connecting " + err)
  }
  console.log("Connected correctly to DB server");
  db.close();
});

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
};
