var formatDate = require('../libs/date.js');
    fs = require('fs'),
    mongoose = require('mongoose'),
    db = require('../models/category'),
    menu = require('../models/menus'),
    user = require('../models/users');
    //格式化当前时间
    var now = formatDate(new Date(),"yyyy-MM-dd hh:mm:ss");
    console.log(now);
    //连接数据库 hatank
    mongoose.Promise = global.Promise;
    mongoose.connect('mongodb://localhost:27017/hatank',function (err) {
        if (err) {
            console.log('链接失败');
        } else {
            console.log('链接成功');
        }
    });
    //备份category表
    db.aggregate([{
        $match:{}
    }]).then(function (categorys) {
        //categorys表中含有数据
        if (categorys.length){
            console.log('---category表--总共有------'+categorys.length+'-----条数据----');
            console.log('-------正在进行备份操作---请稍后----');
            bakReadFiles('categorys',function () {
                fs.writeFileSync('../database/baks/categoryBak_'+now+'.json',JSON.stringify(categorys));
                console.log('---------category表--备份成功-------');
                console.log('---------../database/baks/categoryBak_'+now+'.json--文件写入成功-------');
            });
            return;
        }
        console.log('----------category表没有任何数据,跳过category表备份操作！--------');
    });
    //备份menus表
    menu.aggregate([{
        $match:{}
    }]).then(function (menus) {
        //menus表中含有数据
        if (menus.length){
            console.log('---menus表--总共有------'+menus.length+'-----条数据----');
            console.log('-------正在进行备份操作---请稍后----');
            bakReadFiles('menus',function () {
                fs.writeFileSync('../database/baks/menusBak_'+now+'.json',JSON.stringify(menus));
                console.log('---------menus表--备份成功-------');
                console.log('---------../database/baks/menusBak_'+now+'.json--文件写入成功-------');
            });
            return;
        }
        console.log('----------menus表没有任何数据,跳过menus表备份操作！--------');
    });
    //备份users表
    user.aggregate([{
        $match:{}
    }]).then(function (users) {
        //users表中含有数据
        if (users.length){
            console.log('---users表--总共有------'+users.length+'-----条数据----');
            console.log('-------正在进行备份操作---请稍后----');
            bakReadFiles('user',function () {
                fs.writeFileSync('../database/baks/usersBak_'+now+'.json',JSON.stringify(users));
                console.log('---------users表--备份成功-------');
                console.log('---------../database/baks/usersBak_'+now+'.json--文件写入成功-------');
            });
            return;
        }
        console.log('----------users表没有任何数据,跳过users表备份操作！--------');
    });
//通用处理函数
var bakReadFiles = function (param,cb) {
    //读取备份记录
    var records = JSON.parse(fs.readFileSync('../database/time/bak.json','utf-8')).baks;
    records.push({
        time:now,
        type:param
    });
    fs.writeFileSync('../database/time/bak.json',JSON.stringify({baks:records}),'utf-8');
    cb&&cb();
};