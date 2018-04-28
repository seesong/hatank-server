/**导入加密模块*/
var crypto = require("crypto-js"),
    ccap = require('ccap'),
    config = require('../libs/config'),
    upload = require('../routers/upload'),
    cookieParser = require('cookie-parser'),
    session = require('express-session'),
    request = require('request'),
    app = require('express')()
    .use(cookieParser())
    .use(session({
        resave: false, //添加 resave 选项
        saveUninitialized: true, //添加 saveUninitialized 选项
        secret: 'aF,.j)wBhq+E9n#aHHZ91Ba!VaoMfC', // 建议使用 128 个字符的随机字符串
        cookie: {maxAge:15*60*1000}
    })),
    router = require('express').Router(),
    fs = require('fs'),
    svgCaptcha = require('svg-captcha'),
    users = require('../models/users'),
    category = require('../models/category'),
    menus = require('../models/menus'),
    random = require('../libs/key');
/**
 * 用户名登录
 */
router.post('/users/login',function (req,res) {
    // console.log('-29--session--statusCode--'+session.statusCode);
    var obj = JSON.parse(req.body.forData);
    console.log('-31---login----');
    console.log(req.body);
    var now = Date.now();
    // console.log(now);
    users.find({nickName:obj.userName,password:obj.userPass},function (err,response) {
        console.log(response)
        if (err){
            console.log(err);
            return;
        }
        //登录失败
        if (response==null||!response.length){
            res.json({
                success:0,
                errMsg:'用户名或密码不正确！'
            });
            return;
        }
        //登录成功
        var statusCode = random(32,['num','en']);
        // console.log('------statusCode-----::'+statusCode);
        session.recordTime = now;
        session.statusCode = statusCode;
        res.json({
            success:1,
            errMsg:'登录成功！',
            statusCode:statusCode,
            userId:response[0]._id
        });
    });
});
/**
 * 微信登录
 */
router.post('/users/weixin',function (req,res) {
    var obj = JSON.parse(req.body.forData);
    console.log(req.body);
    var now = Date.now();
    // 用前台传过来的req.body.code，请求腾讯服务器换取 openid 和 session_key
    request('https://api.weixin.qq.com/sns/jscode2session?appid=wxaf9337a65519fad4&secret=6bb326d3adf3bbc2531f006756013585&js_code='+req.body.code+'&grant_type=authorization_code',function (err,response,body) {
        // console.log(body);
        users.find({
            openid:JSON.parse(body).openid
        },function (err,data) {
           if(err){
               console.log(err);
               return;
           }
            var news = {
                gender: obj.gender,
                city: obj.city,
                province: obj.province,
                country: obj.country,
            },userId;
            //新增微信用户
            if (!data.length){
                var _id ='cai'+now;
                userId = _id;
                console.log('-----null-----');
                news.openid = JSON.parse(body).openid;
                news._id = _id;
                news.nickName = obj.nickName;
                news.img = obj.avatarUrl;
                users.insertMany(news,function (insertErr,insertRel) {
                    if(insertErr){
                        console.log(insertErr);
                        return;
                    }
                    console.log('------新增微信用户------::'+JSON.parse(body).openid);
                    // console.log(insertRel);
                    res.json({
                        success: 1,
                        errMsg: '登录成功！',
                        userId:userId,
                    });
                });
            }
            //更新用户信息
            if (data.length){
                console.log('-----update-----');
                //更新指定openid的用户信息
                users.update({
                    openid:JSON.parse(body).openid
                },{
                    $set:news
                },function (updateErr, updateData) {
                    if (updateErr) {
                        console.log(updateErr);
                        return;
                    }
                    console.log('------更新微信用户信息成功------::'+JSON.parse(body).openid);
                    users.aggregate([
                        {
                            $match:{
                                openid:JSON.parse(body).openid
                            }
                        },
                        {
                            $project:{
                                _id:'$_id'
                            }
                        }
                    ]).then(function (openid_to_id) {
                        console.log('-------当前_id------');
                        res.json({
                            success: 1,
                            errMsg: '登录成功！',
                            userId:openid_to_id[0]._id,
                        });
                    });
                });
            }
        });
    });
});
/**
 * 手机号登录/注册
 */
router.post('/users/phone',function (req,res) {
    var obj = JSON.parse(req.body.forData);
    console.log('-151---phone----');
    console.log(req.body);
    var now = Date.now();
    var _id = 'cai'+now;
    // console.log(now);
    var vertify = function () {
        if (session.phone !== obj.phone){
            res.json({
                success:0,
                errMsg:'该手机号与接受验证码的手机号不符合！'
            });
            return;
        }
        if (session.codeStr.toLowerCase() !== obj.code.toLowerCase()){
            res.json({
                success:0,
                errMsg:'验证码不正确！'
            });
            return;
        }
        users.find({
            phone:obj.phone
        }).then(function (rel){
            console.log('----phone--login--174--');
            console.log(rel);
            var statusCode = random(32,['num','en']);
            session.statusCode = statusCode;
            session.recordTime = now;
            if (!rel.length){
                var news = {
                    _id:_id,
                    // openid:_id,
                    nickName:obj.userName,
                    password:obj.userPass,
                    phone:obj.phone,
                    email:obj.email,
                    cookies:[],
                    cooked:[],
                    interest:[],
                    fans:[],
                    comments:[]
                };
                //新用户，未绑定手机号
                users.insertMany(news,function (err,response) {
                    //保存校验状态
                    var rCode = random(12,['num','en']);
                    session.rCode = rCode;
                    res.json({
                        success:1,
                        errMsg:'注册成功！',
                        type:'n',
                        rCode:rCode,
                        userId:_id
                    });
                });
                return;
            }
            var _delId = rel[0]._id;
            //微信端
            if (req.body.userId!==""&&req.body.userId!=undefined){
                users.find({
                    _id:req.body.userId
                }).then(function (data) {
                    //该微信号已经绑定手机号或用户名
                    if (data.length&&(data[0].nickName&&data[0].password||data[0].phone)){
                        //保存校验状态
                        var rCode = random(12,['num','en']);
                        session.rCode = rCode;
                        res.json({
                            success:1,
                            errMsg:'登录成功！',
                            type:'l',
                            userId:rel[0]._id,
                            statusCode:statusCode
                        });
                        return;
                    }
                    users.update({
                        _id:req.body.userId
                    },{
                        $set:{
                            cookies:rel[0].cookies.length?rel[0].cookies:data[0].cookies,
                            agree:rel[0].agree.length?rel[0].agree:data[0].agree,
                            interest:rel[0].interest.length?rel[0].interest:data[0].interest,
                            fans:rel[0].fans.length?rel[0].fans:data[0].fans,
                            comments:rel[0].comments.length?rel[0].comments:data[0].comments,
                            nickName:rel[0].nickName?rel[0].nickName:data[0].nickName,
                            email:rel[0].email?rel[0].email:data[0].email,
                            password:rel[0].password,
                            phone:rel[0].phone,
                        }
                    }).then(function (urel) {
                        console.log('----updateRel---');
                        console.log(urel);
                        users.remove({
                            _id:_delId
                        }).then(function (drel) {
                            console.log('--remove--mobile--user--成功');
                            console.log(drel);
                            //保存校验状态
                            var rCode = random(12,['num','en']);
                            session.rCode = rCode;
                            res.json({
                                success:1,
                                errMsg:'登录成功！',
                                type:'l',
                                // rCode:rCode,
                                userId:rel[0]._id,
                                statusCode:statusCode
                            });
                        });
                    });
                });
                // users.update({
                //     _id:req.body.userId
                // },{
                //     $set:{
                //         phone:obj.phone
                //     }
                // },function (err,response) {
                //     //保存校验状态
                //     var rCode = random(12,['num','en']);
                //     session.rCode = rCode;
                //     res.json({
                //         success:1,
                //         errMsg:'注册成功！',
                //         type:'n',
                //         rCode:rCode,
                //         userId:rel[0]._id,
                //         statusCode:statusCode
                //     });
                // });
                return
            }
            //已经绑定手机号,=>登录
            if (rel.length){
                res.json({
                    success:1,
                    errMsg:'登录成功！',
                    type:'l',
                    userId:rel[0]._id,
                    statusCode:statusCode
                });
            }
        });
    };
    if (obj.phone){
        vertify();
    }
});
/**
 * 用户名注册
 */
router.post('/users/register',function (req,res) {
    var obj = JSON.parse(req.body.forData);
    var now = Date.now();
    var _id ='cai'+now;
    // console.log(req.body);
    console.log('手机号：：，'+session.phone+'，验证码：：'+session.codeStr+'，发送时间：：，'+session.sendTime);
    if (session.phone==undefined){
        res.json({
            success:0,
            errMsg:'请点击发送验证码！'
        });
        return;
    }
    if (obj.phone!=session.phone){
        res.json({
            success:0,
            errMsg:'手机号与接受验证码的手机不符！'
        });
       return;
    }
    var sperate = Math.floor((now-session.sendTime)/1000);
    if (sperate>15*60){
        res.json({
            success:0,
            errMsg:'验证码已过期，请重新获取！'
        });
        return;
    }
    if (obj.code.toLowerCase()!=session.codeStr.toLowerCase()){
        res.json({
            success:0,
            errMsg:'验证码不正确！'
        });
        return;
    }
    var news = {
        nickName:obj.userName,
        password:obj.userPass,
        phone:obj.phone,
        email:obj.email,
        cookies:[],
        cooked:[],
        interest:[],
        fans:[],
        comments:[]
    };
    users.find({
        _id:req.body.userId
    }).then(function (existKey) {
        // console.log(existKey);
        if (!existKey.length) {
            users.find({
                phone:obj.phone
            },function (err,data) {
                if (err){
                    console.log(err)
                    return
                }
                if (data.length){
                    res.json({
                        success:0,
                        errMsg:'注册失败！此手机号已注册！可直接用此手机号登录！',
                    });
                    return
                }
                news._id = _id;
                // news.openid = _id;
                users.insertMany(news,function (err,data) {
                    if (err){
                        console.log(err);
                        return;
                    }
                    res.json({
                        success:1,
                        errMsg:'注册成功',
                        userId:_id
                    });
                });
            })
            return
        }
        if(existKey.length&&(existKey[0].nickName===obj.userName)){
            res.json({
                success:0,
                errMsg:'该用户名已存在'
            });
            return;
        }
        if (existKey.length&&existKey[0].phone){
            res.json({
                success:0,
                errMsg:'注册失败,您已经注册过！',
            });
            return;
        }
        users.update({
            _id:req.body.userId
        },{
            $set:news
        },function (err,data) {
            if (err){
                console.log(err);
                return;
            }
            // console.log(data);
            if(!data.nModified){
                res.json({
                    success:0,
                    errMsg:'注册失败，稍后重试！',
                });
                return;
            }
            res.json({
                success:1,
                errMsg:'注册成功',
                userId:_id
            });
        });
    });
});
/**
 * 发送验证码
 */
router.post('/sendCode',function (req,res) {
    //发送验证码
    var sendCode = function (cb) {
        //验证码为codeStr，时效性为15分钟，6位纯数字
        var codeStr = random(6);
        // console.log('------验证码为-----：'+codeStr);
        // 调用第三方发送平台 ==>>codeStr
        var url = 'http://v.juhe.cn/sms/send?mobile='+req.body.phone+'&tpl_id=68038&tpl_value=%2523code%2523%253d'+codeStr+'&dtype=&key=f117eb1e37babcc8c2f27b97c2b5808f';
        // request(url,function (err,res,body) {
        //     var bodyObj = JSON.parse(body);
        //     console.log(bodyObj);
        //     if (!bodyObj.error_code){
                    //验证码存session,计算时效性
                    session.codeStr = codeStr;
                    session.sendTime = now;
                    session.phone = req.body.phone;
                    console.log('手机号：：，'+session.phone+'，验证码：：'+session.codeStr+'，发送时间：：，'+session.sendTime);
                    cb&&cb();
        //          return;
        //     }
        //     res.json({
        //         success:0,
        //         errMsg:'发送失败，手机号不正确！'
        //     });
        // });
    };
    //校验手机号
    var sendCommon = function (send) {
        //判断是否已注册
        users.find({_id:req.body.userId},function (err,response) {
            if (err){
                console.log(err);
                return;
            }
            //已注册
            if (response.length&&response[0].phone) {
                //用户名注册方式
                if (req.body.type==='r'){
                    res.json({
                        success:0,
                        errMsg:'发送失败！，您已经绑定'+response[0].phone.substr(0,3)+'****'+response[0].phone.substr(8,4)+'手机号，无须重复注册！'
                    });
                }
                //手机号注册方式
                if (req.body.type==='p'){
                    //该手机号是已绑定手机号
                    if (response[0].phone===req.body.phone){
                        //发送验证码
                        send&&send();
                        return;
                    }
                    //该手机号与已绑定手机号不符，发送失败
                    res.json({
                        success:0,
                        errMsg:'发送失败！，您已经绑定'+response[0].phone.substr(0,3)+'****'+response[0].phone.substr(8,4)+'，该手机号与已绑定手机号不符！'
                    });
                }
                //新手机号
                if (req.body.type==='n'){
                    //该手机号已绑定,需要更换其他新手机号
                    if (response[0].phone===req.body.phone){
                        res.json({
                            success:0,
                            errMsg:'发送失败！，您已经绑定'+response[0].phone.substr(0,3)+'****'+response[0].phone.substr(8,4)+'手机号，必须更换一个新手机号！'
                        });
                        return;
                    }
                    //发送验证码
                    send&&send();
                }
                return;
            }
            //未注册,发送验证码
            send&&send();
        });
    };
    //更改新手机号时,清空session
    if (req.body.type==='n'){
        session.codeStr = '';
    }
    if (req.body.phone!='undefined'){
        var now = Date.now();
        // console.log('------当前时间-----：'+now);
        // console.log('------当前验证码-----：'+session.codeStr);
        if (session.sendTime==undefined||session.codeStr==undefined||!session.codeStr){
            //生成验证码，校验手机号，发送验证码
            sendCommon(function () {
                sendCode(function () {
                    res.json({
                        success:1,
                        errMsg:'发送成功(15分钟有效)！'
                    });
                })
            });
            return;
        }
        var sperate = Math.floor((now-session.sendTime)/1000);
        console.log('------发送验证码后过了-----：'+sperate+'s');
        //验证码尚未过期
        if (sperate<=15*60){
            sendCommon(function () {
                res.json({
                    success:0,
                    errMsg:'验证码已经发送成功，网络可能存在延迟,请耐心等待！(15分钟内有效)'
                });
            });
            return;
        }
        console.log('------验证码过期了----已重新发送---');
        //生成验证码，校验手机号，发送验证码
        sendCommon(function () {
            sendCode(function () {
                res.json({
                    success:1,
                    errMsg:'发送成功(15分钟有效)！'
                });
            })
        });
        return;
    }
    res.json({
       success:0,
       errMsg:'手机号不正确'
    });
});
/**
 * 查询个人信息
 */
router.post('/users/query',function (req,res) {
    console.log(req.body);
    if(req.body.setting==='true'){
        users.aggregate([{
            $project:{
                nickName:1,
                password:1,
                img:1,
                phone:1,
                email:1
            }
        },{
            $match:{
                _id:req.body.userId
            }
        }]).then(function (user) {
            // console.log(user);
            res.json({
                nickName:user.length?user[0].nickName:'',
                password:user.length?user[0].password:'',
                img:user.length?user[0].img:'',
                phone:user.length?user[0].phone:'',
                email:user.length?user[0].email:'',
            });
        });
        return;
    }
    //查询用户信息
    users.aggregate([
        {
          $match:{
              _id:req.body.userId
          }
        }
    ]).then(function (result) {
        // console.log(result);
        if (!result.length){
            res.json({
                cookies: [],
                cooked:  0,
                fans:  [],
                data:[],
                nickName:"",
                userImg:""
            });
            return;
        }
        var page = req.body.page?req.body.page:1;
        if (req.body.mark=='cookies') {
            category.aggregate([{
                $project:{
                    title:1,
                    albums:1,
                    cid:1,
                    cname:1,
                    focused:1,
                    cookied:1,
                    scored:1,
                    agreed:1,
                    userId:1
                }
            },{
                $match:{
                    _id:{
                        $in:result[0].cookies
                    }
                }
            },{
                $skip:(page-1)*5
            },{
                $limit:5
            }]).then(function (cookies) {
                category.aggregate([{
                    $match:{
                        userId:result[0]._id
                    }
                },{
                    $group:{
                        _id:'$_userId',
                        cooks:{
                            $sum:1
                        }
                    }
                }]).then(function (cooks) {
                    // console.log(cooks);
                    var userIds = [];
                    cookies.forEach(function (item,index) {
                        userIds.push(item.userId)
                    })
                    users.aggregate([{
                        $match:{
                            _id:{
                                $in:userIds
                            }
                        }
                    },{
                        $project:{
                            img:1,
                            nickName:1,
                            _id:1
                        }
                    }]).then(function (userIdsImgs) {
                        console.log('---userIdsImgs---');
                        console.log(userIdsImgs);
                        var ncookies = [];
                        userIdsImgs.forEach(function (uitem,uindex) {
                            cookies.forEach(function (citem,cindex) {
                                if (uitem._id==citem.userId){
                                    var obj = new Object()
                                    obj = citem
                                    obj.imgUrl = uitem.img
                                    obj.nickName = uitem.nickName
                                    ncookies.push(obj)
                                }
                            })
                        })
                        console.log('--658---')
                        console.log(ncookies)
                        res.json({
                            cookies: result[0].cookies,
                            cooked:cooks.length?cooks[0].cooks:0,
                            fans: result[0].fans,
                            data:ncookies,
                            nickName:result[0].nickName,
                            userImg:result[0].img
                        });
                    })
                });
            });
        }
        if (req.body.mark=='cooks'){
            category.aggregate([{
                $project:{
                    title:1,
                    albums:1,
                    cid:1,
                    cname:1,
                    focused:1,
                    cookied:1,
                    scored:1,
                    agreed:1,
                    userId:1
                }
            },{
                $match:{
                    userId:result[0]._id
                }
            },{
                $skip:(page-1)*5
            },{
                $limit:5
            }]).then(function (cookes) {
                var ncooks = [];
                cookes.forEach(function (item,index) {
                    var obj = item
                    obj.imgUrl = result[0].img
                    obj.nickName = result[0].nickName
                    ncooks.push(obj)
                })
                res.json({
                    data:ncooks
                });
            });
        }
        if (req.body.mark=='fans'){
            users.aggregate([{
                $match:{
                    _id:{
                        $in:result[0].fans
                    }
                }
            },{
                $project:{
                    nickName:1,
                    fans:1,
                    img:1,
                    createTime:{
                        // 将createTime字段加上8*60*60*1000毫秒后,再格式化时间
                        $dateToString: {
                            format: "%Y年%m月%d日",
                            date: {
                                $add:['$createTime',8*60*60*1000]
                            }
                        },
                        // $dateToString: {
                        //     format: "%Y-%m-%d %H:%M:%S",
                        //     date: {
                        //         $add:['$createTime',8*60*60*1000]
                        //     }
                        // }
                    }
                }
            },{
                $skip:(page-1)*5
            },{
                $limit:5
            }]).then(function (fans){
                // console.log('---fans---')
                // console.log(fans);
                // console.log(result[0].fans)
                category.aggregate([{
                    $match:{
                        userId:{
                            $in:result[0].fans
                        }
                    }
                },{
                    $group:{
                        _id:'$userId',
                        cooks:{
                            $sum:1
                        }
                    }
                }]).then(function (cooks) {
                    // console.log('---cooks---')
                    // console.log(cooks)
                    var newFans = [];
                    cooks.forEach(function (cook) {
                        fans.forEach(function (fan) {
                            if (cook._id===fan._id){
                                var obj = fan;
                                obj.cooks = cook.cooks;
                                newFans.push(obj);
                            }
                        });
                    });
                    // console.log('---newFans---')
                    // console.log(newFans);
                    res.json({
                        data:newFans
                    });
                });
            });
        }
    });
});
/**
 * 已经关注的
 */
router.post('/users/focus',function (req,res) {
    // console.log(req.body);
    //查询用户信息
    users.aggregate([
        {
            $match:{
                _id:req.body._id
            }
        }
    ]).then(function (result) {
        // console.log(result);
        if (result.length&&result[0].interest!=undefined){
            var page = req.body.page?req.body.page:1;
            //主页 关注分页查询
            if (req.body.main){
                users.aggregate([{
                    $match: {
                        _id: {
                            $in: result[0].interest
                        }
                    }
                }]).then(function (userData) {
                    // console.log('---userData---');
                    // console.log(JSON.stringify(userData));
                    category.aggregate([
                        {
                            $project:{
                                title:1,
                                albums:1,
                                cid:1,
                                cookied:1,
                                scored:1,
                                userId:1,
                                agreed:1
                            }
                        },{
                            $match:{
                                userId:{
                                    $in:result[0].interest
                                }
                            }
                        },{
                            $sort:{
                                scored:-1
                            }
                        },{
                            $skip:(page-1)*5
                        },{
                            $limit:5
                        }
                    ]).then(function (data) {
                        // console.log('---data---');
                        // console.log(JSON.stringify(data));
                        var newD = [];
                        userData.forEach(function (item,index) {
                            data.forEach(function (ditem,dindex) {
                                if (item._id==ditem.userId){
                                    var obj = ditem;
                                    obj.nickName = item.nickName;
                                    obj.img = item.img;
                                    obj.focusId = item._id;
                                    newD.push(obj);
                                }
                            })
                        })
                        // console.log('---newD---');
                        // console.log(newD)
                        res.json(newD);
                    });
                })
                return;
            }
            //用户关注的
            category.aggregate([{
                $match:{
                    userId:{
                        $in:result[0].interest
                    }
                }
            },{
                $group:{
                    _id:'$cname',
                    result:{
                        $push:{
                            _id:"$_id",
                            title:'$title',
                            albums:'$albums',
                            cid:'$cid',
                            userId:"$userId",
                            cname:'$cname'
                        }
                    }
                }
            },{
                $sort:{
                    scored:-1
                }
            }]).then(function (indata) {
                var news = [];
                for (var i in indata){
                    var obj = new Object();
                    obj._id = indata[i]._id;
                    obj.focusId = indata[i].userId;
                    obj.result = indata[i].result.slice(0,5);
                    news.push(obj);
                }
                // console.log(news);
                res.json({
                    interest: news
                });
            });
            return;
        }
        res.json({
            interest: []
        });
    });
});
/**
 * 所有的种类，包括关注的和未关注的
 */
router.post('/users/unfocus',function (req,res) {
     console.log(req.body);
    var page = req.body.page?req.body.page:1;
    users.aggregate([{
        $project:{
            title:1,
            img:1,
            nickName:1
        }
    },{
        $skip:(page-1)*9
    },{
        $limit:9
    }]).then(function (indata) {
        res.json({
            tunes:indata
        });
    });
});
/**
 * 修改个人信息
 */
router.post('/users/update',function (req,res) {
    // console.log(req.body);
    // console.log(session.codeStr);
    //校验原始密码
    if(req.body.type==='vertifyPass'){
        users.find({
            _id:req.body.userId
        }).then(function (pass) {
            //正确
            if (pass.length&&pass[0].password===req.body.pass){
                //保存校验状态
                var rCode = random(12,['num','en']);
                session.rCode = rCode;
                res.json({
                    success:1,
                    errMsg:'校验成功！',
                    rCode:rCode
                });
                return;
            }
            res.json({
                success:0,
                errMsg:'密码不正确！'
            });
        });
        return;
    }
    //校验手机号
    if(req.body.type==='vertifyPhone'){
        users.find({
            phone:req.body.phone
        }).then(function (phone) {
            //正确
            if(!phone.length){
                res.json({
                    success:0,
                    errMsg:'该手机号未绑定！'
                });
                return;
            }
            if (req.body.code&&req.body.code===session.codeStr){
                //保存校验状态
                var rCode = random(12,['num','en']);
                session.rCode = rCode;
                res.json({
                    success:1,
                    errMsg:'校验成功！',
                    rCode:rCode
                });
                return;
            }
            res.json({
                success:0,
                errMsg:'验证码不正确！'
            });
        });
        return;
    }
    //修改手机号
    if (req.body.type==="updatePhone"){
        //校验码正确
        if((req.body.rCode!='undefined')&&(req.body.rCode===session.rCode)){
            if (!req.body.code||req.body.code!==session.codeStr){
                res.json({
                    success:0,
                    errMsg:'验证吗不正确！'
                });
                return;
            }
            users.update({
                _id:req.body.userId
            },{
                $set:{
                    phone:req.body.phone
                }
            }).then(function (data) {
                res.json({
                    success:1,
                    errMsg:'手机号修改成功'
                });
            });
            return;
        }
        //校验码不正确，未做密保验证
        res.json({
            success:0,
            errMsg:'你需要先进行验证，通过后才可更改设置密码！'
        });
    }
    //修改密码
    if (req.body.type==="updatePass"){
        //校验码正确
        if((req.body.rCode!='undefined')&&(req.body.rCode===session.rCode)){
            users.update({
                _id:req.body.userId
            },{
                $set:{
                    password:req.body.pass
                }
            },function (err,data) {
                if (err){
                    console.log(err);
                    return;
                }
                res.json({
                    success:1,
                    errMsg:'密码设置成功'
                });
            });
            return;
        }
        //校验码不正确，未做密保验证
        res.json({
            success:0,
            errMsg:'你需要先进行验证，通过后才可更改设置密码！'
        });
    }
    //修改用户名
    if(req.body.type==="updateUserName"){
        users.find({
            nickName:req.body.userName
        }).then(function (data) {
            // console.log(session.picCode);
            if (req.body.picCode!=undefined&&req.body.picCode.toLowerCase()!==session.picCode){
                res.json({
                    success:0,
                    errMsg:"图形验证码不正确！"
                });
                return;
            }
            //不存在该用户名
            if (!data.length){
                //更新用户名
                users.update({
                    _id:req.body.userId
                },{
                  $set:{
                      nickName:req.body.userName
                  }
                }).then(function (rel) {
                   res.json({
                      success:1,
                      errMsg:"更新成功！"
                   });
                });
                return;
            }
            res.json({
                success:0,
                errMsg:"更新失败，该用户名已经存在！"
            });
        });
    }
    //修改email
    if(req.body.type==="updateEmail"){
        console.log(req.body)
        users.find({
            email:req.body.email
        }).then(function (data) {
            // console.log(session.picCode);
            if (req.body.picCode!=undefined&&req.body.picCode.toLowerCase()!==session.picCode){
                res.json({
                    success:0,
                    errMsg:"图形验证码不正确！"
                });
                return;
            }
            // console.log(data)
            //不存在该邮箱
            if (!data.length){
                //更新用户名
                users.update({
                    _id:req.body.userId
                },{
                    $set:{
                        email:req.body.email
                    }
                }).then(function (rel) {
                    res.json({
                        success:1,
                        errMsg:"更新成功！"
                    });
                });
                return;
            }
            res.json({
                success:0,
                errMsg:"更新失败，该email已经存在！"
            });
        });
    }
});
//头像更新服务
router.post('/users/upload',upload.single('icon'),function (req, res, next) {
    console.log('----upload--forData---');
    console.log(req.body)
    //移动端更改头像
    if (req.body.upload==="fm"){
        var base64Data = req.body.icon.replace(/^data:image\/\w+;base64,/,'');
        var dataBuffer = new Buffer(base64Data,'base64');
        var mark = req.body.userId+'-'+random(12,['en','num']);
        fs.writeFileSync('./statics/images/icons-'+mark+'.jpg',dataBuffer);
        users.update({
            _id:req.body.userId
        },{
            $set:{
                img:config.serverUrl+'/statics/images/icons-'+mark+'.jpg'
            }
        }).then(function (result) {
            console.log(result);
            if (result.nModified){
                res.json({
                    success:1,
                    errMsg:'头像更新成功！'
                })
                return
            }
            res.json({
                success:0,
                errMsg:'头像更新失败，稍后重试！'
            })
        });
        return;
    }
    //微信端更改头像
    console.log(req.file);
    //更新用户头像
    users.update({
        _id:req.body.userId
    },{
        $set:{
            img:config.serverUrl+'/statics/images/'+req.file.filename
        }
    }).then(function (result) {
        console.log(result)
        if (result.nModified){
            res.json({
                success:1,
                errMsg:'头像更新成功！'
            })
            return
        }
        res.json({
            success:0,
            errMsg:'头像更新失败，稍后重试！'
        })
    });
});
//图片验证码
router.post('/picCode',function (req,res) {
    if (req.body.userId){
        var ccapArray = ccap({
            width:128,//set width,default is 256
            //height:60,//set height,default is 60
            offset:28,//set text spacing,default is 40
            quality:100,//set pic quality,default is 50
            generate:function(){//Custom the function to generate captcha text
                //generate captcha text here
                return random(4,['num','en']);//return the captcha text
            }
        }).get();
        var txt = ccapArray[0];
        var picBuffer = ccapArray[1];
        session.picCode = txt.toLowerCase();
        console.log('---session---picCode---'+session.picCode);
        res.json({
            success:1,
            src:picBuffer.toString('base64')
        });
        return;
    }
    res.json({
        success:0,
        errMsg:"获取不到用户id，无法为您提供验证码！"
    });
});
//登录状态校验
router.post('/isLogined',function (req,res) {
    // console.log('----isLogined-----')
    // console.log(req.body)
    if (req.body.statusCode!=undefined&&session.statusCode!=undefined&&req.body.statusCode===session.statusCode){
        res.json({
            success:1,
            errMsg:"登录成功"
        });
        return;
   }
   res.json({
       success:0,
       errMsg:'登录状态已过期，访问该页面需要用户已经登录！'
   });
});
module.exports = router;
