var multer = require('multer');
var md5 = require('md5');
var keyStr = require('../libs/key');
var storage = multer.diskStorage({
    //设置上传文件路径,可上传至文件服务器
    //Note:传递的是一个函数，创建文件夹；传递的是一个字符串，multer会自动创建
    destination:'statics/images',
    //获取文件MD5，重命名，添加后缀,文件重复会直接覆盖
    filename: function (req, file, cb) {
        // console.log(req.body);
        var fileFormat =(file.originalname).split(".");
        cb(null, file.fieldname + '-' + md5(file) + '-' + keyStr(16,['en','num']) + "." + fileFormat[fileFormat.length - 1]);
    }
});
//添加配置文件到muler对象。
var upload = multer({
    storage: storage,
    //其他设置请参考multer的limits
    //limits:{}
});
//导出对象
module.exports = upload;