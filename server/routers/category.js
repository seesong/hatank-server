var router = require('express').Router(),
    fs = require('fs'),
    category = require('../models/category'),
    config = require('../libs/config'),
    menus = require('../models/menus'),
    users = require('../models/users'),
    key = require('../libs/key'),
    upload = require('./upload');
//微信小程序,新建菜谱图片上传
router.post('/users/uploadNew',upload.single('new'),function (req, res) {
    console.log('----upload--formData---');
    console.log(req.body)
    console.log(req.file)
    //新建菜单批量上传图片
    res.json({
        url: config.serverUrl+'/'+req.file.path
    });
});
/**
 * 新建菜谱
 */
router.post('/category/new',function (req,res) {
    var now = Date.now()
    console.log('-----req---请求')
    console.log(req.body)
    //小程序提交的新菜谱数据
    var newData = JSON.parse(req.body.menuData)
    console.log('--原始数据--')
    console.log(newData)
    //小程序端新建菜谱
    if (req.body.new!=undefined&&req.body.new!=""){
        insertWxNewData()
        //数据库category表插入新数据
        function insertWxNewData() {
            category.find({
                _id:newData._id
            }).then(function (data) {
                if (!data.length){
                    category.insertMany(newData).then(function (result) {
                        console.log('----数据插入结果---')
                        console.log(result)
                        res.json({
                            success:1,
                            errMsg:'新建菜谱成功！'
                        })
                    });
                    return
                }
                newData._id = key(4);
                insertData()
            });
        }
        return
    }
    //h5新建菜谱
    var albums = newData.albums
    for (let i=0;i<newData.albums.length;i++){
        //过滤data:URL
        var base64Data = newData.albums[i].bannerImgUrl.replace(/^data:image\/\w+;base64,/, "");
        var dataBuffer = new Buffer(base64Data, 'base64');
        var mark = newData.userId+'-'+key(12,['en','num']);
        // console.log(dataBuffer)
        fs.writeFileSync('./statics/images/steps-'+mark+'.jpg',dataBuffer);
        newData.albums[i].bannerImgUrl = config.serverUrl+'/statics/images/steps-'+mark+'.jpg';
    }
    var steps = newData.steps
    for (let i=0;i<newData.steps.length;i++){
        //过滤data:URL
        var base64Data = newData.steps[i].img.replace(/^data:image\/\w+;base64,/, "");
        var dataBuffer = new Buffer(base64Data, 'base64');
        var mark = newData.userId+'-'+key(12,['en','num']);
        // console.log(dataBuffer)
        fs.writeFileSync('./statics/images/steps-'+mark+'.jpg',dataBuffer);
        newData.steps[i].img = config.serverUrl+'/statics/images/steps-'+mark+'.jpg';
    }
    // console.log('--albums-new-')
    // console.log(albums)
    // console.log('--steps-new-')
    // console.log(steps)
    newData.steps = steps
    newData.albums = albums
    // console.log('--newdata---')
    insertData()
    //数据库category表插入新数据
    function insertData() {
        category.find({
            _id:newData._id
        }).then(function (data) {
            if (!data.length){
                category.insertMany(newData).then(function (result) {
                    // console.log('----数据插入结果---')
                    // console.log(result)
                    res.json({
                        success:1,
                        errMsg:'新建菜谱成功！'
                    })
                });
                return
            }
            newData._id = key(4);
            insertData()
        });
    }
})
/**
 * 条件查询
 */
router.post('/search',function (req,res) {
    console.log(req.body);
    var nameReg,markVal,page;
    nameReg = req.body.searchValue?req.body.searchValue:'';
    markVal = req.body.mark?req.body.mark:0;
    page = req.body.page?req.body.page:1;
    //通用
    function reMapData(data,cb){
        var userIds = [];
        data.forEach(function (item) {
            userIds.push(item.userId)
        })
        users.aggregate([{
            $project:{
                img:1,
                nickName:1,
                _id:1
            }
        },{
            $match:{
                _id:{
                    $in:userIds
                }
            }
        }]).then(function (udata) {
            var ndata = [];
            udata.forEach(function (uitem) {
                data.forEach(function (citem) {
                    if (uitem._id==citem.userId){
                        var temp = {}
                        temp.title = citem.title
                        temp.albums = citem.albums
                        temp._id = citem._id
                        temp.tags = citem.tags
                        temp.cookied = citem.cookied
                        temp.scored = citem.scored
                        temp.agreed = citem.agreed
                        temp.userId = citem.userId
                        temp.imgUrl = uitem.img
                        temp.nickName = uitem.nickName
                        ndata.push(temp)
                    }
                })
            })
            cb && cb(ndata);
        })
    }
    // 通用
    function processJsonData(data){
        //按评分
        if (markVal==1){
            reMapData(data,function (ndata) {
                ndata.sort(function (v1,v2) {
                    return v2.scored - v1.scored
                });
                res.json(ndata);
            })
            return
        }
        //按点赞
        if (markVal==2){
            reMapData(data,function (ndata) {
                ndata.sort(function (v1,v2) {
                    return v2.agreed - v1.agreed
                });
                res.json(ndata);
            })
            return
        }
        //默认
        reMapData(data,function (ndata) {
            res.json(ndata)
        })
    }
    //按用户名查询 通用
    function searchByUname() {
        var sortType = {}
        if (markVal==0){
            sortType._id = 1
        }
        //按评分
        if (markVal==1){
            sortType.scored = -1
        }
        //按点赞
        if (markVal==2){
            sortType.agreed = -1
        }
        var obj = {};
        if (nameReg){
            obj.nickName = eval('/'+nameReg+'/')
        }
        users.aggregate([{
            $match:obj
        },{
            $project:{
                _id:1
            }
        }]).then(function (uids) {
            var newUids = [];
            uids.forEach(function (uitem) {
                newUids.push(uitem._id)
            })
            category.aggregate([{
                $match:{
                    userId:{
                        $in:newUids
                    }
                }
            },{
                $sort:sortType
            },{
                $skip:(page-1)*15
            },{
                $limit:15
            }]).then(function (data) {
                processJsonData(data)
            })
        })
    }
    //按用户id查询 通用
    function searchByUid() {
        var sortType = {}
        if (markVal==0){
            sortType._id = 1
        }
        //按评分
        if (markVal==1){
            sortType.scored = -1
        }
        //按点赞
        if (markVal==2){
            sortType.agreed = -1
        }
        var obj = {};
        if (nameReg){
            obj.userId = eval('/'+nameReg+'/')
        }
        category.aggregate([{
            $match:obj
        },{
            $sort:sortType
        },{
            $skip:(page-1)*15
        },{
            $limit:15
        }]).then(function (data) {
            processJsonData(data)
        })
    }
    //按条件查询
    function searchBy(cb) {
        //按照用户id模糊搜索
        if (req.body.searchBy=="uid"){
            searchByUid()
            return;
        }
        //按照用户名字模糊搜索
        if (req.body.searchBy=="uname"){
            searchByUname()
            return;
        }
        cb && cb();
    }
    if (nameReg){
        //评分最多
        if (markVal==1){
            searchBy(function () {
                //默认按照菜品关键字搜索
                category.find({
                    $or:[{
                        title:eval('/'+nameReg+'/')
                    },
                        {
                            tags:eval('/'+nameReg+'/')
                        },
                        {
                            cname:eval('/'+nameReg+'/')
                        },
                        {
                            topName:eval('/'+nameReg+'/')
                        }]
                }).sort({
                    scored:-1
                }).skip((page-1)*15).limit(15).then(function (data) {
                    reMapData(data,function (ndata) {
                        ndata.sort(function (v1,v2) {
                            return v2.scored - v1.scored
                        })
                        res.json(ndata)
                    })
                });
            })
            return
        }
        //赞过最多
        if (markVal==2){
            searchBy(function () {
                //默认按照菜品关键字搜索
                category.find({
                    $or:[{
                        title:eval('/'+nameReg+'/')
                    },
                        {
                            tags:eval('/'+nameReg+'/')
                        },
                        {
                            cname:eval('/'+nameReg+'/')
                        },
                        {
                            topName:eval('/'+nameReg+'/')
                        }]
                }).sort({
                    agreed:-1
                }).skip((page-1)*15).limit(15).then(function (data) {
                    reMapData(data,function (ndata) {
                        ndata.sort(function (v1,v2) {
                            return v2.agreed - v1.agreed
                        })
                        res.json(ndata)
                    })
                });
            })
            return
        }
        searchBy(function () {
            //默认按照菜品关键字搜索
            category.find({
                $or:[{
                    title:eval('/'+nameReg+'/')
                },
                    {
                        tags:eval('/'+nameReg+'/')
                    },
                    {
                        cname:eval('/'+nameReg+'/')
                    },
                    {
                        topName:eval('/'+nameReg+'/')
                    }]
            }).skip((page-1)*15).limit(15).then(function (data) {
                reMapData(data,function (ndata) {
                    res.json(ndata)
                })
            });
        });
    }
    if (!nameReg){
        //评分最多
        if (markVal==1){
            searchBy(function () {
                //默认按照菜品关键字搜索
                category.find().sort({
                    scored:-1
                }).skip((page-1)*15).limit(15).then(function (data) {
                    reMapData(data,function (ndata) {
                        ndata.sort(function (v1,v2) {
                            return v2.scored - v1.scored
                        })
                        res.json(ndata)
                    })
                });
            })
            return
        }
        //赞过最多
        if (markVal==2){
            searchBy(function () {
                //默认按照菜品关键字搜索
                category.find().sort({
                    agreed:-1
                }).skip((page-1)*15).limit(15).then(function (data) {
                    reMapData(data,function (ndata) {
                        ndata.sort(function (v1,v2) {
                            return v2.agreed - v1.agreed
                        })
                        res.json(ndata)
                    })
                });
            })
            return
        }
        searchBy(function () {
            //默认按照菜品关键字搜索
            category.find().skip((page-1)*15).limit(15).then(function (data) {
                reMapData(data,function (ndata) {
                    res.json(ndata)
                })
            });
        });
    }
});
/**
 * 查询菜谱分类
 */
router.post('/query',function (req,res) {
    console.log(req.body);
    //首页
    if (req.body.hot!=undefined&&req.body.new!=undefined){
        //热门推荐 降序排序 截取前5条
        category.find().sort({agreed:-1}).limit(5).then(function (hotRes) {
            category.find().sort({updateTime:-1}).limit(5).then(function (newRes) {
                res.json({
                    result:{
                        hot:hotRes,
                        new:newRes
                    }
                });
            });
        });
    }
    if (req.body.menus!=undefined){
        menus.aggregate([{
            $group:{
                _id:'$topName',
                result:{
                    $push:{
                        title:'$title',
                        _id:'$_id',
                        img:'$img',
                        topId:'$topId'
                    }
                }
            }
        }]).then(function (rel) {
           // console.log(JSON.stringify(res));
           res.json({
              data: rel
           });
        });
    }
});
/**
 * 查询单个菜谱分类下的菜单列表
 */
router.post('/category/cid',function (req,res) {
    console.log(req.body);
    //普通分类cid，category表直接查找
    var page = req.body.page?req.body.page:1;
    if (req.body.cid!='undefined'&&req.body.cid!=''){
        //查询匹配cid的文档
        category.aggregate([{
            $match:{
                cid:req.body.cid
            }
        },{
            $skip:(page-1)*10
        },{
            $limit:10
        }]).then(function (data) {
            // console.log(data);
            if (!data.length){
                res.json({
                    result:data,
                });
                return;
            }
            user.find({
                _id:data[0].userId
            }).then(function (users) {
                // console.log(users);
                //查询匹配cid的文档 计数
                category.aggregate([{
                    $match:{
                        cid:req.body.cid
                    }
                },{
                    $group:{
                        _id:"$cid",
                        counts:{
                            $sum:1
                        },
                        focus:{
                            $sum:'$focused'
                        }
                    }
                }]).then(function (group) {
                    //查询匹配cid的文档 统计关注量
                    res.json({
                        result:data,
                        counts:group[0].counts,
                        focus:group[0].focus,
                        userImg:users[0].img,
                        nickName:users[0].nickName
                    });
                });
            });
        });
        return
    }
    //user表 _id查询openid 关联category表 userId查找
    if (req.body.focusId!='undefined'&&req.body.focusId!=''){
        user.aggregate([
            {
                $project:{
                    _id:1,
                    nickName:1,
                    img:1
                }
            },{
                $match:{
                    _id:req.body.focusId
                }
            }]).then(function (users) {
                // console.log('---users--');
                // console.log(users);
                category.aggregate([{
                    $match:{
                        userId:users[0]._id
                    }
                },{
                    $skip:(page-1)*10
                },{
                    $limit:10
                }]).then(function (data) {
                    // console.log('--224--')
                    // console.log(data);
                    if (!data.length){
                        res.json({
                            result:data,
                        });
                        return;
                    }
                    //查询匹配userId的文档
                    category.aggregate([{
                        $match:{
                            userId:users[0]._id
                        }
                    },{
                        $group:{
                            _id:'$userId',
                            //统计发布数
                            counts:{
                                $sum:1
                            },
                            //查询匹配userId的文档 统计关注量
                            focus:{
                                $sum:'$focused'
                            }
                        }
                    }]).then(function (group) {
                        // console.log('--250----')
                        // console.log(group);
                        var sendobj = {
                          result:data,
                          counts:group[0].counts,
                          focus:group[0].focus,
                          userImg:users[0].img,
                          nickName:users[0].nickName
                        }
                        res.json(sendobj);
                    });
                })
        });
        return
    }
    res.json({
      success:0,
      errMsg:'未知错误'
    })
});
/**
 * 根据名字查询_id
 */
router.post('/category/getId',function (req,res) {
  console.log(req.body)
  user.find({
    nickName:req.body.nickName
  }).then(function (_idData) {
    // console.log(_idData)
    res.json(_idData[0]._id)
  })
})
/**
 * 查询id对应菜种详情
 */
router.post('/category/id',function (req,res) {
    console.log(req.body);
    category.find({_id:req.body.id},function (err,data) {
        if (err){
            console.log(err);
            return;
        }
        if (data.length){
            var ingredients=[];
            data[0].ingredients.split(';').forEach(function (value) {
                var obj = {};
                obj.materiaName = value.split(',')[0];
                obj.materiaWeight = value.split(',')[1];
                ingredients.push(obj);
            });
            data[0].ingredients = JSON.stringify(ingredients);
            //是否收藏过
            users.find({
                _id:req.body.userId
            }).then(function (user) {
                // console.log(user[0].cookies);
                var cookied=0,agree=0;
                if (user.length&&user[0].cookies.indexOf(req.body.id)!='-1'){
                    // console.log('----cookies中存在该元素----');
                    cookied = 1;
                }
                if (user.length&&user[0].agree.indexOf(req.body.id)!='-1'){
                    // console.log('----agree中存在该元素----');
                    agree = 1;
                }
                users.find({
                    _id:data[0].userId
                }).then(function (cuid) {
                  //
                    res.json({
                        materias:data[0],
                        ingredients:ingredients,
                        cookied:cookied,
                        agree:agree,
                        nickName:cuid[0].nickName,
                        imgUrl:cuid[0].img
                    });
                })
            });
            return;
        }
        res.json({
            rel:null
        });
    });
});
/**
 * 删除菜谱+添加菜谱
 */
router.post('/category/manger',function (req,res) {
    console.log(req.body);
    //删除菜谱
    if (req.body.del!=undefined){
        category.remove({
            _id:req.body.id
        }).then(function (del) {
            res.json({
                success:1,
                errMsg:"删除成功！"
            });
        });
        return;
    }
    //添加菜谱
    if (req.body.new!=undefined){

    }
});
/**
 * 看过菜谱
 */
router.post('/category/history',function (req,res) {
    console.log(req.body);
    category.find({id:req.body.id},function (err,data) {
        if (err){
            console.log(err);
            return;
        }
        res.json({
            data:data
        });
    });
});
/**
 * 收藏菜谱+取消收藏
 */
router.post('/category/cookie',function (req,res) {
    console.log(req.body);
    //取消收藏
    if (req.body.cancel!=undefined){
        users.aggregate([
            {
                $match:{
                    _id:req.body.userId
                }
            }
        ]).then(function (cookies) {
            var cookies = cookies[0].cookies;
            var delIdx = cookies.indexOf(req.body.id);
            cookies.splice(delIdx,1);
            users.update({
                _id:req.body.userId
            },{
                $set:{
                    'cookies':cookies
                }
            }).then(function () {
                res.json({
                    success:1,
                    errMsg:"取消成功！"
                });
            });
        });
        return;
    }
    //收藏
    users.aggregate([
        {
            $match:{
                _id:req.body.userId
            }
        },
        {
            $project:{
                cookies:1
            }
        }
    ]).then(function (cookies) {
        console.log('---cookies查询结果----');
        var cookies = cookies[0].cookies;
        //还未做过
        if(cookies.indexOf(req.body.id)=='-1'){
            console.log('------还未收藏过-------');
            cookies.push(req.body.id);
            users.update({
                _id:req.body.userId
            },{
                $set:{
                    'cookies':cookies
                }
            }).then(function (data) {
                // console.log(data);
                category.aggregate([
                    {
                        $match:{
                            _id:req.body.id
                        }
                    },{
                        $project:{
                            cookied:1
                        }
                    }
                ]).then(function (categorys) {
                    if (!categorys.length){
                        return;
                    }
                    var cookied = categorys[0].cookied;
                    category.update({
                        _id:req.body.id
                    },{
                        $set:{
                            'cookied':cookied+1
                        }
                    }).then(function () {
                        res.json({
                            cookied:1
                        });
                    });
                });
            });
            return;
        }
        console.log('------已经收藏过-------');
        res.json({
            cookied:1
        });
    });
});
/**
 * 关注菜谱+取消关注+关注外的其他分类
 */
router.post('/category/interest',function (req,res) {
    console.log(req.body);
    //关注的分类
    if (req.body.interest){
        user.aggregate([{
            $project:{
                interest:1
            }
        },{
            $match:{
                _id:req.body.userId,
            }
        }]).then(function (us) {
            // console.log(us);
            //已经关注的
            var interest = us[0].interest.length?us[0].interest:[];
            // console.log(interest);
            category.aggregate([{
                $match:{
                    userId:{
                        $in:interest
                    }
                }
            },{
                $group:{
                    _id:"$cname",
                    result:{
                        $push:{
                            menus:'$tags',
                            _id:"$_id",
                            title:'$title',
                            albums:'$albums',
                            cid:'$cid',
                            cname:'$cname',
                            userId:"$userId"
                        }
                    }
                }
            }]).then(function (rel) {
                // console.log(rel);
               res.json({
                   data:rel
               });
            });
        });
        return;
    }
    //未关注的分类
    if (req.body.outInterest){
        var page = req.body.page?req.body.page:1;
        user.aggregate([{
            $match:{
                _id:req.body.userId,
            }
        },{
            $skip:(page-1)*9
        },{
            $limit:9
        }]).then(function (us) {
            //已经关注的
            var interest = us[0].interest.length?us[0].interest:[];
            category.aggregate([{
                $match:{
                    userId:{
                        $nin:interest
                    }
                }
            }]).then(function (rel) {
                res.json({
                    data:rel
                });
            });
        });
        return;
    }
    //是否关注
    if(req.body.isfocus!='undefined'&&req.body.isfocus!=undefined){
        user.aggregate([{
           $match:{
               _id:req.body.userId,
           }
        }]).then(function (us) {
            if (!us.length){
                res.json({
                    focus:0
                })
                return
            }
          // console.log(us)
            //未关注
            // console.log(us[0].interest.indexOf(req.body.focusId));
            if (us[0].interest.indexOf(req.body.focusId)!="-1"){
                res.json({
                    focus:1
                });
                return;
            }
            res.json({
                focus:0
            });
        });
        return;
    }
    //添加关注
    if(req.body.type==="add"){
        // console.log('add');
        user.aggregate([{
            $match:{
                _id:req.body.userId,
            }
        }]).then(function (us) {
            if (!us.length){
                res.json({
                    success:2,
                    errMsg:'请先登录'
                })
                return
            }
            // console.log(us);
            if (us[0].interest.indexOf(req.body.focusId)=="-1"){
                var newsIns = us[0].interest;
                newsIns.push(req.body.focusId);
                user.update({
                    _id:req.body.userId,
                },{
                    $set:{
                        interest:newsIns
                    }
                }).then(function (rel) {
                    // console.log(rel);
                    res.json({
                       success:1,
                       errMsg:"关注成功！"
                    });
                });
                return;
            }
            res.json({
                success:0,
                errMsg:"关注失败，您已经关注了！"
            });
        });
        return;
    }
    //取消关注
    if(req.body.type==="cancel"){
        // console.log('cancel');
        user.aggregate([{
            $match:{
                _id:req.body.userId,
            }
        }]).then(function (us) {
            var newsIns = us[0].interest;
            var thisIdx = newsIns.indexOf(req.body.focusId);
            if (thisIdx!="-1"){
                newsIns.splice(thisIdx,1);
                user.update({
                    _id:req.body.userId,
                },{
                    $set:{
                        interest:newsIns
                    }
                }).then(function (rel) {
                    // console.log(rel);
                    res.json({
                        success:1,
                        errMsg:"取消关注成功！"
                    });
                });
                return;
            }
            res.json({
                success:0,
                errMsg:"取消失败，您还未关注！"
            });
        });
        return;
    }
});
/**
 * 点赞菜谱
 */
router.post('/category/agree',function (req,res) {
    console.log(req.body);
    users.aggregate([
        {
            $match:{
                _id:req.body.userId
            }
        },
        {
            $project:{
                agree:'$agree'
            }
        }
    ]).then(function (agree) {
        var agrees = agree[0].agree;
        //还未点过赞
        if(agrees.indexOf(req.body.id)=='-1'){
            console.log('------还未点过赞-------');
            agrees.push(req.body.id);
            users.update({
                _id:req.body.userId
            },{
                $set:{
                    'agree':agrees
                }
            }).then(function (data) {
                // console.log(data);
                category.aggregate([
                    {
                        $match:{
                            _id:req.body.id
                        }
                    },{
                        $project:{
                            agreed:'$agreed'
                        }
                    }
                ]).then(function (categorys) {
                    if (!categorys.length){
                        return;
                    }
                    var agreed = categorys[0].agreed;
                    category.update({
                        _id:req.body.id
                    },{
                        $set:{
                            'agreed':agreed+1
                        }
                    }).then(function () {
                        res.json({
                            agree:1
                        });
                    });
                });
            });
            return;
        }
        console.log('------已经点过赞le-------');
        res.json({
            agree:1
        });
    });
});
/**
 * 菜谱评分
 */
router.post('/category/score',function (req,res) {
    console.log(req.body);
    category.find({id:req.body.id},function (err,data) {
        if (err){
            console.log(err);
            return;
        }
        res.json({
            data:data
        });
    });
});
/**
 * 评论菜谱
 */
router.post('/category/commented',function (req,res) {
    console.log(req.body);
    category.find({id:req.body.id},function (err,data) {
        if (err){
            console.log(err);
            return;
        }
        res.json({
            data:data
        });
    });
});
module.exports = router;
