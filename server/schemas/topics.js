var mongoose = require('mongoose');
//定义模式
var topicsSchema = new mongoose.Schema({
    _id:String,
    title : String,
    img : String,
    detail:String,
    userId:String,
    cookied:Number,
    history:Number,
    agreed:Number,
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
module.exports = topicsSchema;
