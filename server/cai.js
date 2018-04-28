var express = require('express'),
    https = require('https'),
    fs = require("fs"),
    app = express(),
    /** express路由管理模块*/
    Router = express.Router();
var cors = require('cors'),
    mongoose = require('mongoose'),
    bodyParser = require('body-parser'),
    port = process.env.PORT || 5000;
    //https请求证书校验
    // var options = {
    //     key : fs.readFileSync('ssl/www.hatank.com/2_www.hatank.com.key'),
    //     cert : fs.readFileSync('ssl/www.hatank.com/1_www.hatank.com_bundle.crt')
    // };
    // https.createServer(options,app).listen(port,function () {
    //     console.log(options);
    // });
    app.listen(port);
    console.log('hatank started on port ' + port);
    app.use(bodyParser.urlencoded({limit: '10mb',extended: true }));
    app.use(bodyParser.json({limit: '10mb'}))
    /** 静态文件托管 */
    .use('/statics', express.static(__dirname + '/statics'))
    /*** 解决跨域*/
    .use(cors());
    //连接数据库 hatank
    mongoose.Promise = global.Promise;
    mongoose.connect('mongodb://localhost:27017/hatank', function(err) {
        if (err) {
            console.log('链接失败');
        } else {
            console.log('链接成功');
        }
    });
/**
 * 封装对外接口文件
 * 前端访问路径示例：
 * /api/main
 *
 */
var category = require('./routers/category');
app.use('/api', category);
/**
 * 初始化数据库 category表
 */
var db = require('./routers/db');
app.use('/api', db);

/*
 * 用户管理
 * */
var users = require('./routers/users');
app.use('/api', users);

/*
 *   菜谱用户评价
 */
var comments = require('./routers/comments');
app.use('/api', comments);