var router = require('express').Router(),
    fs = require('fs'),
    config = require('../libs/config'),
    comments = require('../models/comments');
/**
 * 添加评价
 */
router.post('/comments/add',function (req,res) {
    console.log(req.body);
    comments.find({id:req.body.id},function (err,data) {
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
 * 查询评价
 */
router.post('/comments',function (req,res) {
    console.log(req.body);
    comments.find({id:req.body.id},function (err,data) {
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
 * 删除评价
 */
router.post('/comments/del',function (req,res) {
    console.log(req.body);
    comments.find({id:req.body.id},function (err,data) {
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