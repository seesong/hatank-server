var mongoose = require('mongoose');
//定义模式
var usersSchema = new mongoose.Schema({
    _id:String,
    openid:String,
    nickName:String,
    img:String,
    password:String,
    phone:String,
    email:String,
    gender:String,
    city:String,
    province:String,
    country:String,
    cookies:Array,
    agree:Array,
    interest:Array,
    fans:Array,
    comments:Array,
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
module.exports = usersSchema;
