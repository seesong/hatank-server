var formatDate = require('../libs/date.js');
    fs = require('fs'),
    mongoose = require('mongoose'),
    db = require('../models/category'),
    menu = require('../models/menus'),
    user = require('../models/users');
    //连接数据库 hatank
    mongoose.Promise = global.Promise;
    mongoose.connect('mongodb://localhost:27017/hatank',function (err) {
        if (err) {
            console.log('链接失败');
        } else {
            console.log('链接成功');
        }
    });
    //格式化当前时间
    var now = formatDate(new Date(),"yyyy-MM-dd hh:mm:ss");
    console.log(now);
    //查询数据库category表
    db.aggregate([{
        $match:{}
    }]).then(function (categorys) {
        console.log('---category--总共有------'+categorys.length+'-----条数据----');
        if (categorys.length){
            console.log('-------表categorys已存在数据，您无须进行初始化操作----您可以先删除所有数据后---再次尝试初始化操作！');
            return;
        }
        console.log('-------正在进行初始化操作---请稍后----');
        console.log('.......................');
        //通用处理函数调用
        restoreReadFiles('categorys',function () {
            var categoryBak = fs.readFileSync('../database/baks/categoryBak_'+recordFromAt+'.json','utf-8');
            db.insertMany(JSON.parse(categoryBak),function (err,data) {
                console.log('-------表categorys初始化完成-------');
            });
        });
    });
    //查询数据库menus表
    menu.aggregate([{
        $match:{}
    }]).then(function (menus) {
        console.log('---menus--总共有------'+menus.length+'-----条数据----');
        if (menus.length){
            console.log('-------表menus已存在数据，您无须进行初始化操作----您可以先删除所有数据后---再次尝试初始化操作！');
            return;
        }
        console.log('-------正在进行初始化操作---请稍后----');
        console.log('.......................');
        //通用处理函数调用
        restoreReadFiles('menus',function () {
            var menusBak = fs.readFileSync('../database/baks/menusBak_'+recordFromAt+'.json','utf-8');
            menu.insertMany(JSON.parse(menusBak),function (err,data) {
                console.log('-------表menus初始化完成-------');
            });
        });
    });
    //查询数据库users表
    user.aggregate([{
        $match:{}
    }]).then(function (users) {
        console.log('---users--总共有------'+users.length+'-----条数据----');
        if (users.length){
            console.log('-------表users已存在数据，您无须进行初始化操作----您可以先删除所有数据后---再次尝试初始化操作！');
            return;
        }
        console.log('-------正在进行初始化操作---请稍后----');
        console.log('.......................');
        //通用处理函数调用
        restoreReadFiles('menus',function () {
            var usersBak = fs.readFileSync('../database/baks/usersBak_'+recordFromAt+'.json','utf-8');
            user.insertMany(JSON.parse(usersBak),function (err,data) {
                console.log('-------表users初始化完成-------');
            });
        });
    });
//通用处理函数
var restoreReadFiles = function (param,cb) {
    //读取备份记录
    var bakRecordsSum = JSON.parse(fs.readFileSync('../database/time/bak.json','utf-8')).baks,bakRecords=[];
    bakRecordsSum.forEach(function (value) {
        if (value.type==param){
            bakRecords.push(value);
        }
    });
    //存在备份
    if (bakRecords.length){
        //读取恢复记录
        var restoreRecords = JSON.parse(fs.readFileSync('../database/time/restore.json','utf-8')).restores;
        recordFromAt = bakRecords[bakRecords.length-1].time;
        restoreRecords.push({
            type:param,
            time:now,
            recordFromAt:recordFromAt
        });
        fs.writeFileSync('../database/time/restore.json',JSON.stringify({restores:restoreRecords}),'utf-8');
        cb&&cb();
        return;
    }
    console.log('-----------不存在'+param+'备份记录，请先执行备份操作!-----确保数据库不为空-----bak------');
};