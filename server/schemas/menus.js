var mongoose = require('mongoose');
//定义模式
var categorySchema = new mongoose.Schema({
    _id:String,
    title : String,
    img : String,
    topId : String,
    topName : String,
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
module.exports = categorySchema;
