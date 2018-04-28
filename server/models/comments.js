var mongoose = require('mongoose');
var commentsSchema = require('../schemas/comments');
var comments = mongoose.model('comments',commentsSchema,'comments');
module.exports = comments;

