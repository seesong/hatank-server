var mongoose = require('mongoose');
//定义模式
var categorySchema = new mongoose.Schema({
    _id:String,
    title : String,
    tags : String,
    imtro : String,
    tips : String,
    ingredients :String,
    burden : String,
    albums : Array,
    steps : Array,
    cid : String,
    cname : String,
    topId : String,
    topName : String,
    userId:String,
    focused:Number,
    cookied:Number,
    cooked:Number,
    scored:Number,
    history:Number,
    agreed:Number,
    commented:Array,
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
