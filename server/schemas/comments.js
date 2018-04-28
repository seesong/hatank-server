var mongoose = require('mongoose');
//定义模式
var commentsSchema = new mongoose.Schema({
    _id:String,
    author:String,
    authorIcon:String,
    commentsCategoryAt:String,
    comments:String,
    answersIds:Array,
    agree:Array,
    createTime: {
        type: Date,
        default: Date.now
    },
    updateTime: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: { createdAt: 'createTime', updatedAt: 'updateTime' }
});
module.exports = commentsSchema;
