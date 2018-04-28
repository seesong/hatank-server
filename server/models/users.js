var mongoose = require('mongoose');
/**
 * 引入自定义的模式 category
 * @type {*|mongoose.Schema}
 */
var usersSchema = require('../schemas/users');
var users = mongoose.model('users',usersSchema,'users');
module.exports = users;

