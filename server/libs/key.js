module.exports = function (bit,charTypeArr) {
    //根据指定长度生成字母和数字的随机数
    //0~9的ASCII为48~57
    //A~Z的ASCII为65~90
    //a~z的ASCII为97~122
    var codeArr="",random="",charTypeArrs=charTypeArr!=undefined?charTypeArr:[];
    var generateArr = function (start,end) {
        var arr = [];
        for (var i=start;i<=end;i++){
            arr.push(String.fromCharCode(i));
        }
        return arr;
    };
    //英文，数字
    if (charTypeArrs.indexOf('num')!='-1'&&charTypeArr.indexOf('en')!='-1'){
        codeArr = generateArr(48,57).concat(generateArr(65,90),generateArr(97,122));
        for (var i=0;i<bit;i++){
            var posi = Math.ceil(Math.random()*(codeArr.length-1));
            random += codeArr[posi];
        }
        return random;
    }
    //仅英文
    if (charTypeArrs.indexOf('en')!='-1'){
        codeArr = generateArr(65,90),generateArr(97,122);
        for (var i=0;i<bit;i++){
            var posi = Math.ceil(Math.random()*(codeArr.length-1));
            random += codeArr[posi];
        }
        return random;
    }
    //默认是数字验证码
    codeArr = generateArr(48,57);
    for (var i=0;i<bit;i++){
        var posi = Math.ceil(Math.random()*(codeArr.length-1));
        random += codeArr[posi];
    }
    return random;
};