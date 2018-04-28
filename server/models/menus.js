var mongoose = require('mongoose');
/**
 * 引入自定义的模式 category
 * @type {*|mongoose.Schema}
 */
var menusSchema = require('../schemas/menus');
var menus = mongoose.model('menus',menusSchema,'menus');
module.exports = menus;

