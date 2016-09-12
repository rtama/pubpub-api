import { NotModified, BadRequest } from './errors';

const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

const Journal = require('./models').Journal;
const User = require('./models').User;
const Atom = require('./models').Atom;
const Link = require('./models').Link;

export function getUserByID(req, res, next) {
  const x = {fish: 5};
  const y = {...x};
  // Set the query based on whether the params.id is a valid ObjectID;
  const isValidObjectID = mongoose.Types.ObjectId.isValid(req.params.id);
  const query = isValidObjectID ? { $or:[ {'_id': req.params.id}, {'username': req.params.id} ]} : { 'username': req.params.id };

  // Set the parameters we'd like to return
  const select = {_id: 1, username: 1, firstName: 1, lastName: 1, name: 1, image: 1, bio: 1, publicEmail: 1, github: 1, orcid: 1, twitter: 1, website: 1, googleScholar: 1};

  // Make db call
  User.findOne(query, select).lean().exec()
  .then(function(userResult) {
    if (!userResult) { throw new BadRequest(); }
    userResult.userID = userResult._id;
    delete userResult._id;
    return res.status(200).json(userResult);
  })
  .catch(function(error) {
    return res.status(404).json(error);
  });
};
