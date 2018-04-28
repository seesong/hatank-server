var mongoose = require('mongoose');
/**
 * 引入自定义的模式 category
 * @type {*|mongoose.Schema}
 */
var topicsSchema = require('../schemas/topics');
var topics = mongoose.model('topics',topicsSchema,'topics');
module.exports = topics;

