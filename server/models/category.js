var mongoose = require('mongoose');
/**
 * 引入自定义的模式 category
 * @type {*|mongoose.Schema}
 */
var categorySchema = require('../schemas/category');
var category = mongoose.model('category',categorySchema,'category');
module.exports = category;

