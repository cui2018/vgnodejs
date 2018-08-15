//输出到控制台
global.echo = txt => console.log(txt);
//输出日志到控制台
global.log = (txt,save = true) => {
	txt = `[${time().timeFormat()}]${typeof txt == "object" ? JSON.stringify(txt) : txt}`;
	echo(txt);
	if ( save ) {
		if ( !global.fs ) global.fs = require("fs");
		fs.appendFile("./log/log.log",`${txt}\r\n`,"utf8");
	}
};
//输出给客户端
global.print = txt => RES.write(txt);
global.end = (txt = "") => RES.end(txt);
//解析json数据
global.json2o = json => {
	if ( typeof json != "string" ) return false;
	if ( !json.isJSON() ) return false;
	let o = JSON.parse(json);
	return o;
};
//post方法
/*global.post = fn => {
	if ( REQ.method.toUpperCase() == "POST" ) {
		let bufferArr = [];
		REQ.on("data", data => {
			bufferArr.push(data);
		} );
		REQ.on("end", () => {
			let str = Buffer.concat(bufferArr).toString();
			let postData = str.isJSON() ? json2o(Buffer.concat(bufferArr).toString()) : str;
			if ( fn ) fn(postData);
		} );
		return true;
	}
	else return false;
}*/

global.post = fn => {
	if ( REQ.method.toUpperCase() == "POST" ) {
		let bufferArr = [];
		REQ.on("data", data => {
			bufferArr.push(data);
		} );
		REQ.on("end", () => {
			let str = decodeURI(Buffer.concat(bufferArr).toString());
			let postData = str.isJSON() ? json2o(Buffer.concat(bufferArr).toString()) : str;
			let datas = {};
			for ( let [i,item] of str.split("&").entries() ) {
				let arr = item.split("=");
				if ( arr.length == 2 ) datas[arr[0]] = arr[1];
				else {
					datas = {};
					break;
				}
			}
			if ( !datas.isEmpty() ) postData = datas;
			if ( fn ) {
				let md5 = LOAD.library("md5");
				let sign = postData.sign;
				delete postData.sign;
				let keys = Object.keys(postData);
				keys.sort((a,b) => {
					return a < b ? -1 : 1;
				} );
				let param = [];
				for ( let [i,key] of keys.entries() ) {
					param.push(key + "=" + (typeof postData[key] == "string" || typeof postData[key] == "number" ? postData[key] : md5.en(JSON.stringify(postData[key]))));
				}
				let signature = param.join("&");
				signature += "&key=Asc9C8Uv89I4gdNfsBG89dF8ds80VgYu";
				signature = md5.en(signature);
				if ( sign == signature ) {
					/*if( typeof postData.formid != "undefined" && postData.formid != '' && postData.formid != "the formId is a mock one") rlog("addModelformid", {
						openid : postData.openid || postData.open_id,
						formid : postData.formid
					} );*/
					fn(postData);
				}
				else api_error(5004);
			}
		} );
		return true;
	}
	else return false;
};
//资源地址
global.ufv = url => {
	if ( ONLINE ) return "https://domain.com" + url + "?v=" + VERSION;
	else return "http://resource.domain" + url + "?v=" + VERSION;
};
//空函数
global.noop = () => "";
//对象遍历迭代器
global.entries = function*(obj) {
	if ( obj ) {
		for ( let key of Object.keys(obj) ) {
			yield [key,obj[key]];
		}
	}
};
//当前时间戳
global.time = () => parseInt(new Date().getTime() / 1000);
global.microtime = () => new Date().getTime() / 1000;
//时间转时间戳
global.strtotime = str => str ? new Date(str).getTime() / 1000 : "";
//日时间戳，获取距1970-01-01的天数
global.day = (stime = time()) => parseInt((parseInt(stime) + 3600 * 8) / (3600 * 24)) + 1;
//周时间戳，获取距1970-01-01的周数
global.week = (stime = time()) => parseInt((day(stime) + 2) / 7);
//将日时间戳转换为秒时间戳
global.daytotime = (sday) => sday ? (parseInt(sday) - 1) * (3600 * 24) - (3600 * 8) : time();
//时间戳格式化函数
global.timeFormat = (time,reg) => {
	let times = "";
	if ( reg == "due" ) {
		let ago = time() - time;
		if ( ago / ( 3600 * 24 * 365 ) > 1 ) return parseInt(ago / ( 3600 * 24 * 365 )) + "年前";
		else if ( ago / ( 3600 * 24 * 30 ) > 1 ) return parseInt(ago / ( 3600 * 24 * 30 )) + "个月前";
		else if ( ago / ( 3600 * 24 * 7 ) > 1 ) return parseInt(ago / ( 3600 * 24 * 7 )) + "周前";
		else if ( ago / ( 3600 * 24 ) > 1 ) return parseInt(ago / ( 3600 * 24 )) + "天前";
		else if ( ago / 3600 > 1 ) return parseInt(ago / 3600) + "小时前";
		else if ( ago / 60 > 1 ) return parseInt(ago / 60) + "分钟前";
		else if ( ago > 1 ) return ago + "秒前";
		else return "刚刚";
		return times;
	}
	reg = reg ? reg : "%Y-%m-%d %H:%i:%s";
	with ( new Date(parseInt(time) * 1000) ) {
		times = reg.replace(/%Y/g,getFullYear())
				   .replace(/%m/g,( getMonth() + 1 ).leading())
				   .replace(/%d/g,getDate().leading())
				   .replace(/%H/g,getHours().leading())
				   .replace(/%i/g,getMinutes().leading())
				   .replace(/%s/g,getSeconds().leading());
	}
	return times;
};
//格式化日期（用于豪杰榜）
global.formatDate = function(reg) {
	let myyear = reg.getFullYear(); 
	let mymonth = reg.getMonth()+1; 
	let myweekday = reg.getDate(); 
	if(mymonth < 10){ 
		mymonth = "0" + mymonth; 
	}
	if(myweekday < 10){ 
		myweekday = "0" + myweekday; 
	} 
	return (myyear+"-"+mymonth + "-" + myweekday);
};
//时间戳格式化String扩展
String.prototype.timeFormat = function(reg) {
	return timeFormat(this,reg);
};
//时间戳格式化Number扩展
Number.prototype.timeFormat = function(reg) {
	return timeFormat(this,reg);
};
//黄金分割
Math.gold = (Math.sqrt(5) - 1) / 2;
//显示错误提示
String.prototype.err = function(str) {
	return this.replace(/%s/g,str);
};
//去掉html标记
String.prototype.dropHTML = function() {
	return this.replace(/<[^>].*?>/g,"");
};
//去掉html标记并替换全角空格
String.prototype.dropFormatHTML = function() {
	return this.replace(/<[^>].*?>/g," ").replace(/　/g," ");
};
//转义特殊字符
String.prototype.format = function() {
	return this.replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>");
};
//左截取字符串
String.prototype.left = function(n,str = "...") {
	return this.length > n ? this.slice(0,n) + str : this;
};
//右截取字符串
String.prototype.right = function(n,str = "...") {
	return this.length > n ? str + this.slice(this.length - n) : this;
};
//判断字符串是否是JSON格式，兼容数字
String.prototype.isJSON = function() {
	try {
		if ( !isNaN(this) ) return false;
		JSON.parse(this);
		return true;
	}
	catch(e) {
		return false;
	}
};
Number.prototype.isJSON = function() {
	return false;
};
//二维数组合并
Array.prototype.joinBy = function(key,str) {
	var arr = new Array();
	for ( let [i,item] of this.entries() ) {
		if ( item[key] != null ) arr.push(item[key]);
	}
	return arr.join(str);
};
//二维数组排序
Array.prototype.orderBy = function(order) {
	this.sort( (a,b) => {
		for ( let [key,rule] of entries(order) ) {
			if ( rule.toUpperCase() == "ASC" || parseInt(rule) == 0 ) {
				if ( a[key] > b[key] ) return 1;
				else if ( a[key] < b[key] ) return -1;
			}
			if ( rule.toUpperCase() == "DESC" || parseInt(rule) == 1 ) {
				if ( a[key] > b[key] ) return -1;
				else if ( a[key] < b[key] ) return 1;
			}
		}
	} );
};
//从二位数组中提取一个键作为一维数组
Array.prototype.getArrayByKey = function(key) {
	let arr = new Array();
	for ( let [i,item] of this.entries() ) {
		if ( item.hasOwnProperty(key) ) arr.push(item[key]);
	}
	return arr;
};
//数组递归
Array.prototype.recursion = function(fn,over) {
	let arr = this;
	let i = 0, max = arr.length;
	function recursion() {
		if ( i < max ) fn(i, arr[i], () => {
			i++;
			recursion();
		} );
		else if ( over ) over();
	}
	recursion();
};
//对象递归
Object.prototype.recursion = function(fn,over) {
	let obj = this;
	let keys = obj.keys();
	let i = 0, max = keys.length;
	function recursion() {
		if ( i < max ) fn(keys[i], obj[keys[i]], () => {
			i++;
			recursion();
		} );
		else if ( over ) over();
	}
	recursion();
};
//对象序列化
Object.prototype.serialize = function() {
	let param = [];
	for ( let [key,item] of entries(this) ) {
		param.push(key + "=" + item);
	}
	return param.join("&");
};
//判断对象是否是数组
Array.prototype.isArray = true;
Object.prototype.isArray = false;
//判断对象是否是对象
Array.prototype.isObject = false;
Object.prototype.isObject = true;
//判断对象是否为空
Object.prototype.isEmpty = function() {
	for ( let [i,item] of entries(this) ) {
		return false;
	}
	return true;
};
//对象值合并
global.objectJoin = (foo,bar) => {
	for ( let [key,item] of entries(bar) ) {
		foo[key] = foo[key] ? parseInt(foo[key]) + parseInt(item) : parseInt(item);
	}
	return foo;
};
//前导函数
global.leading = (str,figure,leader) => {
	figure = figure ? figure : 2;
	leader = leader ? leader : 0;
	return ( leader.toString().repeat(figure) + str.toString() ).right(figure,"")
};
//前导String扩展
String.prototype.leading = function(figure,leader) {
	return leading(this,figure,leader);
};
//前导Number扩展
Number.prototype.leading = function(figure,leader) {
	return leading(this,figure,leader);
};
//生成随机整数
global.rand = (from,to) => parseInt(Math.random() * (parseFloat(to) - parseFloat(from) + 1)) + parseFloat(from);
//生成区间内的count个随机数
global.random = (from,to,count) => {
	let result = [];
	if ( count > to - from + 1 ) return result;
	for ( let i = 0; i < count; i++ ) {
		let one = rand(from,to);
		while ( result.indexOf(one) >= 0 ) {
			one = rand(from,to);
		}
		result.push(one);
	}
	return result;
}
//生成随机字符串
global.randex = (n = 16) => {
	let charCodes = [[48,57],[65,90],[97,122]];
	let str = [];
	for ( let i = 0; i < n; i++ ) {
		let r = rand(0,2);
		let m = charCodes[r];
		let c = rand(m[0],m[1]);
		let s = String.fromCharCode(c);
		str.push(s);
	}
	return str.join("");
};
//数组随机项扩展
Array.prototype.rand = function(amount = 1) {
	let arr = [], res = [];
	for ( let [i,item] of this.entries() ) {
		arr.push(item);
	}
	for ( let i = 0; i < amount; i++ ) {
		res.push(arr.splice(rand(0,arr.length - 1),1)[0]);
	}
	return res.length == 1 ? res[0] : res;
};
//对象获取全部属性值的数组
Object.prototype.values = function() {
	let arr = new Array();
	for ( let [key,value] of entries(this) ) {
		arr.push(value);
	}
	return arr;
};
//获取对象的键，或指定位置的键
Object.prototype.keys = function(i) {
	let keys = Object.getOwnPropertyNames(this);
	return typeof i == "undefined" ? keys : keys[i];
};
//404页
global.show_404 = () => {
	RES.end("<h1>404 not found</h1>");
}
//jsonp编码
global.jsonp_encode = data => {
	if ( typeof data == "object" ) data = JSON.stringify(data);
	data = data.replace(/'/g,"\'");
	let res=`${REQ.get.callbackparam}(${data});`;
	RES.end(res);
}

//jsonp请求成功
global.jsonp_encode_success = (data = "") => {
	if ( typeof data == "object" ) data = JSON.stringify(data);
	data = data.replace(/'/g,"\'");
	let res = {
		status : "0000",
		data : data
	};
	let resb=`${REQ.get.callbackparam}(${res});`;
	RES.end(resb);
};
//jsonp请求失败
global.jsonp_encode_error = (code,msg = "") => {
	let codes = LOAD.config("code");
	let res = {
		status : code,
		msg : msg ? msg : (codes[code] ? codes[code] : "")
	};
	if ( typeof res == "object" ) res = JSON.stringify(res);
	console.log(res);
	res = res.replace(/'/g,"\'");
	let resb=`${REQ.get.callbackparam}(${res});`;
	RES.end(resb);
};



//获取客户端IP
global.remoteAddr = () => {
	return "";
	if ( typeof REQ == "undefined" ) return "";
	let ip = REQ.headers["x-forwarded-for"] ||
		REQ.ip ||
		REQ.connection.remoteAddress ||
		REQ.socket.remoteAddress ||
		REQ.connection.socket.remoteAddress || "";
	ip = ip.split(",").length > 0 ? ip.split(",")[0] : ip;
	return ip;
};
//获取对象的第一个键名
Object.prototype.firstKey = function() {
	let keys = Object.keys(this);
	return keys.length > 0 ? keys[0] : "";
};
//数组搜索
Array.prototype.search = function(where,getObj = false) {
	if ( typeof where == "object" ) {
		for ( let [i,item] of this.entries() ) {
			let bingo = true;
			for ( let [field,value] of entries(where) ) {
				if ( item[field] != value ) {
					bingo = false;
					break;
				}
			}
			if ( bingo ) {
				return getObj ? this[i] : i;
				break;
			}
		}
	}
	else {
		for ( let [i,item] of this.entries() ) {
			if ( item == where ) {
				return getObj ? this[i] : i;
				break;
			}
		}
	}
	return false;
};
//对象搜索
Object.prototype.search = function(where,getObj = false) {
	if ( typeof where == "object" ) {
		for ( let [i,item] of entries(this) ) {
			let bingo = true;
			for ( let [field,value] of entries(where) ) {
				if ( item[field] != value ) {
					bingo = false;
					break;
				}
			}
			if ( bingo ) {
				return getObj ? this[i] : i;
				break;
			}
		}
	}
	else {
		for ( let [i,item] of entries(this) ) {
			if ( item == where ) {
				return getObj ? this[i] : i;
				break;
			}
		}
	}
	return false;
};
//接口成功
global.api_success = (data = "") => {
	//let aes = LOAD.library("aes");
	let res = {
		status : "2000",
		data : data
	};
	//end(aes.en(res));
	end(JSON.stringify(res));
	return res;
};

global.api_success_gift = (data = "") => {
	//let aes = LOAD.library("aes");
	let res = {
		status : "2001",
		data : data
	};
	//end(aes.en(res));
	end(JSON.stringify(res));
	return res;
};


//接口失败
global.api_error = (code,msg = "") => {
	//let aes = LOAD.library("aes");
	let codes = LOAD.config("code");
	let res = {
		status : code,
		msg : msg ? msg : (codes[code] ? codes[code] : "")
	};
	//end(aes.en(res));
	end(JSON.stringify(res));
	return res;
};
//验证数据有效性
global.usefull = (data = "",fn = noop) => {
	if ( !data ) return api_error("5001");
	try {
		let aes = LOAD.library("aes");
		data = aes.de(data);
		if ( data.key == "e0c8iJ!89dF77c%`" ) fn(data);
		else return api_error("5003");
	}
	catch (e) {
		return api_error("5002");
	}
};
//生成新用户ID
global.newUserId = len => {
	let stime = time().toString();
	stime = stime.split("");
	stime = stime.slice(stime.length - 8);
	let randoms = [ () => String.fromCharCode(rand(65,90)), () => String.fromCharCode(rand(97,122)) ];
	stime.splice(0,0,randoms[rand(0,1)]());
	for ( let i = 0; i < 7; i++ ) {
		stime.splice(rand(0,stime.length - 1),0,randoms[rand(0,1)]());
	}
	return stime.join("");
};
//记录日志
global.rlog = (type,data) => {
	let redis = LOAD.redis();
	redis.rpush("log", {
		type : type,
		data : data,
		ip : remoteAddr(),
		time : time()
	} );
};
//base64编码
global.base64_encode = str => new Buffer(str).toString("base64");
//base64解码
global.base64_decode = str => new Buffer(str,"base64").toString();
//php base64编码
global.encrypt = str => base64_encode(LOAD.library("aes").en(str));
//php base64解码
global.decrypt = str => LOAD.library("aes").de(base64_decode(str));
//订单号生成器
global.newOrderId = (name = "",len = 6) => {
	name = name.toUpperCase();
	return name + time().timeFormat("%Y%m%d%H%i%s") + rand(Math.pow(10,len - 1),Math.pow(10,len) - 1);
};
//url编码
global.urlencode = str => {
	let res = encodeURIComponent(str);
	res = res.replace(/[^0-9a-zA-Z\-_\.%]/g,res => '%' + res.charCodeAt(0).toString(16).toUpperCase());
	return res;
};
//sql过滤
global.addslashes = str => {
	if ( typeof str != "string" ) return str;
	str = str.replace(/'/g,"\'");
	str = str.replace(/"/g,"\"");
	str = str.replace(/\\/g,"\\\\");
	return str;
};
global.delslashes = str => {
	if ( typeof str != "string" ) return str;
	str = str.replace(/'/g,"");
	str = str.replace(/"/g,"");
	str = str.replace(/\\/g,"");
	str = str.replace(/\r\n/g,"");
	str = str.replace(/\r/g,"");
	str = str.replace(/\n/g,"");
	return str;
};
