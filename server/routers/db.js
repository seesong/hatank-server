var router = require('express').Router(),
    formatDate = require('../libs/date.js');
    request = require('request'),
    config = require('../libs/config'),
    fs = require('fs'),
    db = require('../models/category'),
    menu = require('../models/menus'),
    user = require('../models/users');
var data = [];
/**
 *  生成数据库源文件
 *  ./database/ori/dataOriJson.json
 */
router.post('/createDbOri',function (req,res) {
    var result = req.body.array;
    // request('http://apis.juhe.cn/cook/category?parentid=&dtype=&key=2208fcc1024ea120f6fabeffded013f2',function (err,response,body) {
    // var result = JSON.parse(body).result;
    // var errStr = fs.readFileSync('./ori/database/errCids.txt','utf8');
    console.log(result);
    return;
    for (var i=0;i<result.length;i++){
        for (var j=0;j<result[i].list.length;j++){
            var topId = result[i].parentId;
            var topName = result[i].name;
            var cid = result[i].list[j].id;
            var cname = result[i].list[j].name;
            console.log(topId,topName,cid,cname);
            var pn = 0;
            var totalPages = 1;
            // if (errStr.split('/').indexOf(cid)=='-1'){
            (function (cid,cname,topId,topName) {
                for (var m=0;m<totalPages;m++){
                    request('http://apis.juhe.cn/cook/index?cid='+cid+'&dtype=&pn='+pn+'&rn=30&key=2208fcc1024ea120f6fabeffded013f2',function (err,res,body) {
                        //无返回数据
                        // if(body.result==null){
                        //     console.log('-------position at cid:------'+cid+'-----无返回数据-----');
                        //     if (errStr.indexOf(cid)!='-1'){
                        //         return;
                        //     }
                        //     // 查找错误行标cid，写入错误文件
                        //     fs.appendFileSync('database/ori/errCids.txt',cid+'/',function (err) {
                        //         if(err){
                        //             console.log("cid文件写入失败")
                        //         }else{
                        //             console.log("cid文件写入成功");
                        //         }
                        //     });
                        //     return;
                        // }
                        var resData = JSON.parse(body).result.data;
                        console.log(resData);
                        totalPages = Math.ceil(resData.totalNum/30);
                        pn++;
                        for (var n=0;n<resData.length;n++){
                            var obj = {};
                            obj._id= resData[n].id;
                            obj.title= resData[n].title;
                            obj.tags= resData[n].tags;
                            obj.imtro= resData[n].imtro;
                            obj.ingredients= resData[n].ingredients;
                            obj.burden= resData[n].burden;
                            obj.albums= resData[n].albums;
                            obj.steps= resData[n].steps;
                            obj.cid= cid;
                            obj.cname= cname;
                            obj.topId= topId;
                            obj.topName= topName;
                            data.push(obj);
                            console.log('-----------------这是追加的第'+(n+1)+'条数据');
                            fs.appendFileSync('./database/ori/dataOriJson.json',JSON.stringify(obj),function (err) {
                                if(err){
                                    console.log("文件写入失败")
                                }else{
                                    console.log("文件写入成功");
                                }
                            })
                        }
                    });
                }
            })(cid,cname,topId,topName);
        }
    }
    // }
    // });
    res.json({
        errMsg:'success'
    });
});
/**
 *  生成指定结构的mongodb数据库源文件
 *  根据mongodb数据库源文件生成mongodb数据库文件
 *  初始化数据库 category表
 *  分组+去重复
 */
router.post('/initDbByGroup',function (req,res) {
    var data = JSON.parse(fs.readFileSync('./database/ori/dataOriJson.json','utf8'));
    var arrs = [];
    data.result.forEach(function (item,index) {
        //去除/合并重复项，
        var obj = {};
        if (arrs.length){
            arrs.forEach(function (im,idx) {
                if (item.title===im.title){
                    //同种菜,剔除
                    if(im.cid.indexOf(item.cid)!='-1'&&im.cname.indexOf(item.cname)!='-1'&&im.topId.indexOf(item.topId)!='-1'&&im.topName.indexOf(item.topName)!='-1'){
                        return;
                    }
                    if (im.cid.indexOf(item.cid)=='-1'){
                        im.cid += '/' + item.cid;
                    }
                    if (im.cname.indexOf(item.cname)=='-1'){
                        im.cname += '/' + item.cname;
                    }
                    if (im.topId.indexOf(item.topId)=='-1'){
                        im.topId += '/' + item.topId;
                    }
                    if (im.topName.indexOf(item.topName)=='-1'){
                        im.topName += '/' + item.topName;
                    }
                }
                if (item.title!==im.title&&idx===arrs.length-1){
                    obj._id= index;
                    obj.title= item.title;
                    obj.tags= item.tags;
                    obj.imtro= item.imtro;
                    obj.ingredients= item.ingredients;
                    obj.burden= item.burden;
                    obj.albums= item.albums;
                    obj.steps= item.steps;
                    obj.cid= item.cid;
                    obj.cname= item.cname;
                    obj.topId= item.topId;
                    obj.topName= item.topName;
                    obj.userId = 'root';
                    obj.focused = parseInt(Math.random()*1000)+1;
                    obj.cookied = parseInt(Math.random()*1000)+1;
                    obj.agreed = parseInt(Math.random()*1000)+1;
                    obj.commented = [0,1];
                    arrs.push(obj);
                }
            });
            if (data.result.length-1===index){
                var dataObj = {};
                dataObj.result = arrs;
                // console.log(arrs);
                fs.writeFileSync('./database/ori/mongodb.json',JSON.stringify(dataObj),'utf8');
                console.log("----菜谱ing---mongodb--写入成功---");
                //mongodb数据库中添加文件
                var oriDbData = JSON.parse(fs.readFileSync('./database/ori/mongodb.json','utf8')).result;
                var count = 5;
                var subLen = Math.ceil(oriDbData.length/count);
                db.find({},function (err,res) {
                    //数据库为空时，初始化数据库
                    if (!res.length){
                        for (var from=0;from<count;from++){
                            if (from<count-1){
                                db.insertMany(oriDbData.slice(subLen*from,subLen*(from+1)));
                            }
                            if(from==count-1){
                                db.insertMany(oriDbData.slice(subLen*from,subLen*(from+1))).then(function(res){
                                    console.log('--向category集合中---全部数据已经插入成功！---');
                                });
                            }
                        }
                        return;
                    }
                    console.log('-----category集合已经完成了数据库的初始化，无须重复操作！---');
                });
            }
            return;
        }
        obj._id= index;
        obj.title= item.title;
        obj.tags= item.tags;
        obj.imtro= item.imtro;
        obj.ingredients= item.ingredients;
        obj.burden= item.burden;
        obj.albums= item.albums;
        obj.steps= item.steps;
        obj.cid= item.cid;
        obj.cname= item.cname;
        obj.topId= item.topId;
        obj.topName= item.topName;
        obj.userId = 'root';
        obj.focused = parseInt(Math.random()*1000)+1;
        obj.cookied = parseInt(Math.random()*1000)+1;
        obj.agreed = parseInt(Math.random()*1000)+1;
        obj.commented = [0,1];
        arrs.push(obj);
    });
});
/**
 *  生成指定结构的mongodb数据库源文件
 *  根据mongodb数据库源文件生成mongodb数据库文件
 *  初始化数据库 category表
 *  无分组
 */
router.post('/initDb',function (req,res) {
    var data = JSON.parse(fs.readFileSync('./database/ori/dataOriJson.json','utf8'));
    var arrs = data.result;
    arrs.forEach(function (item,index) {
        arrs[index]._id= index;
        arrs[index].focused = parseInt(Math.random()*1000)+1;
        arrs[index].cookied = parseInt(Math.random()*1000)+1;
        arrs[index].scored = (Math.random()*10).toFixed(1);
        arrs[index].agreed = parseInt(Math.random()*1000)+1;
        arrs[index].commented = [];
        arrs[index].userId = 'cai_ju_he_api_id';
    });
    fs.writeFileSync('./database/ori/mongodb.json',JSON.stringify(arrs),'utf8');
    console.log("----菜谱ing---mongodb数据库文件--更新成功---");
    //mongodb数据库中添加文件
    var oriDbData = arrs;
    var count = 5;
    var subLen = Math.ceil(oriDbData.length/count);
    db.find({},function (err,res) {
        //数据库为空时，初始化数据库
        if (!res.length){
            for (var from=0;from<count;from++){
                if (from<count-1){
                    db.insertMany(oriDbData.slice(subLen*from,subLen*(from+1)));
                }
                if(from==count-1){
                    db.insertMany(oriDbData.slice(subLen*from,subLen*(from+1))).then(function(res){
                        console.log('--向category集合中---全部数据已经插入成功！---');
                    });
                }
            }
            return;
        }
        console.log('-----category集合已经完成了数据库的初始化，无须重复操作！---');
    });
});
/**
 * 初始化数据库 menus表
 */
router.post('/initMenus',function (req,res) {
    var localMenusOri = JSON.parse(fs.readFileSync('./database/ori/category.json')).result;
    var dbMenus = [];
    localMenusOri.forEach(function (value) {
        var obj = {};
        obj.topId = value.topId;
        obj.topName = value.topName;
        obj._id = value._id;
        obj.title = value.title;
        obj.img = value.img;
        dbMenus.push(obj);
    });
    var menusFile = {result:dbMenus};
    console.log(menusFile.result);
    fs.writeFileSync('./database/ori/dbMenus.json',JSON.stringify(menusFile));
    console.log('------menus----本地文件写入成功！');
    menus.find({},function (err,data) {
        if (data.length){
            console.log('-------数据库中已经存在数据---无须重复插入--');
            return;
        }
        menus.insertMany(JSON.parse(fs.readFileSync('./database/ori/dbMenus.json')).result);
    });
});
/**
 *  数据库一键备份
 *  备份 category表
 *  备份 menus表
 *  备份 users表
 */
//修改category表 userId字段
router.post('/updateUserId',function (req,res) {
    var users = [];
    // for (var i=1;i<360;i++){

        // //更新category表 userId字段
        // db.update({
        //     cid:i
        // },{
        //     $set:{
        //         userId:'cai00000'+i
        //     }
        // },{
        //     multi:true
        // }).then(function (data) {});

        //生成users.json表结构文件
        // (function (i) {
        //     db.find({
        //         "userId" : 'cai00000'+i
        //     }).then(function (res) {
        //         console.log(res);
        //         var news = {
        //             _id:'cai00000'+i,
        //             openid:'cai00000'+i,
        //             nickName:res[0].cname,
        //             img:res[0].albums[0],
        //             gender: "0",
        //             city:"beijing",
        //             province: "beijing",
        //             country: "China"
        //         };
        //         fs.appendFileSync('./users.json',JSON.stringify(news)+',');
        //     });
        // })(i);

        //users表插入数据
        var users = JSON.parse(fs.readFileSync('./users.json','utf-8')).users;
        // console.log(users);
        user.insertMany(users).then(function (data) {
            console.log(data);
        });

    // }
});
router.get('/bak',function (req,res) {
    //格式化当前时间
    var now = formatDate(new Date(),"yyyy-MM-dd hh:mm:ss");
    console.log(now);
    //通用处理函数
    var bakReadFiles = function (param,cb) {
        //读取备份记录
        var records = JSON.parse(fs.readFileSync('./database/time/bak.json','utf-8')).baks;
        records.push({
            time:now,
            type:param
        });
        fs.writeFileSync('./database/time/bak.json',JSON.stringify({baks:records}),'utf-8');
        cb&&cb();
    };
    //备份category表
    db.aggregate([{
        $match:{}
    }]).then(function (categorys) {
        //categorys表中含有数据
        if (categorys.length){
            console.log('---category表--总共有------'+categorys.length+'-----条数据----');
            console.log('-------正在进行备份操作---请稍后----');
            bakReadFiles('categorys',function () {
                fs.writeFileSync('./database/baks/categoryBak_'+now+'.json',JSON.stringify(categorys));
                console.log('---------category表--备份成功-------');
                console.log('---------./database/baks/categoryBak_'+now+'.json--文件写入成功-------');
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
                fs.writeFileSync('./database/baks/menusBak_'+now+'.json',JSON.stringify(menus));
                console.log('---------menus表--备份成功-------');
                console.log('---------./database/baks/menusBak_'+now+'.json--文件写入成功-------');
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
                fs.writeFileSync('./database/baks/usersBak_'+now+'.json',JSON.stringify(users));
                console.log('---------users表--备份成功-------');
                console.log('---------./database/baks/usersBak_'+now+'.json--文件写入成功-------');
            });
            return;
        }
        console.log('----------users表没有任何数据,跳过users表备份操作！--------');
    });
});
router.get('/restore',function (req,res) {
    //格式化当前时间
    var now = formatDate(new Date(),"yyyy-MM-dd hh:mm:ss");
    console.log(now);
    //通用处理函数
    var restoreReadFiles = function (param,cb) {
        //读取备份记录
        var bakRecordsSum = JSON.parse(fs.readFileSync('./database/time/bak.json','utf-8')).baks,bakRecords=[];
        bakRecordsSum.forEach(function (value) {
            if (value.type==param){
                bakRecords.push(value);
            }
        });
        //存在备份
        if (bakRecords.length){
            //读取恢复记录
            var restoreRecords = JSON.parse(fs.readFileSync('./database/time/restore.json','utf-8')).restores;
            recordFromAt = bakRecords[bakRecords.length-1].time;
            restoreRecords.push({
                type:param,
                time:now,
                recordFromAt:recordFromAt
            });
            fs.writeFileSync('./database/time/restore.json',JSON.stringify({restores:restoreRecords}),'utf-8');
            cb&&cb();
            return;
        }
        console.log('-----------不存在'+param+'备份记录，请先执行备份操作!-----确保数据库不为空-----bak------');
    };
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
            var categoryBak = fs.readFileSync('./database/baks/categoryBak_'+recordFromAt+'.json','utf-8');
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
            var menusBak = fs.readFileSync('./database/baks/menusBak_'+recordFromAt+'.json','utf-8');
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
            var usersBak = fs.readFileSync('./database/baks/usersBak_'+recordFromAt+'.json','utf-8');
            user.insertMany(JSON.parse(usersBak),function (err,data) {
                console.log('-------表users初始化完成-------');
            });
        });
    });
});
module.exports = router;