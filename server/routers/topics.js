var router = require('express').Router(),
    fs = require('fs'),
    config = require('../libs/config'),
    topics = require('../models/topics');
/**
 * 新增话题
 */
router.post('/topics/add',function (req,res) {
    console.log(req.body);
    topics.find({id:req.body.id},function (err,data) {
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
 * 查询话题集合
 */
router.post('/topics/query',function (req,res) {
    console.log(req.body);
    topics.find({id:req.body.id},function (err,data) {
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
 * 查询话题详情
 */
router.post('/topics/id',function (req,res) {
    console.log(req.body);
    topics.find({id:req.body.id},function (err,data) {
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
 * 话题浏览量
 */
router.post('/topics/history',function (req,res) {
    console.log(req.body);
    topics.find({id:req.body.id},function (err,data) {
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
 * 话题收藏数
 */
router.post('/topics/cookie',function (req,res) {
    console.log(req.body);
    topics.find({id:req.body.id},function (err,data) {
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