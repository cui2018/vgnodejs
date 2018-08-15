module.exports = new class extends Controller {
	constructor() {
		super();
	}
	//用户登录、注册
	index() {
		if ( !post(data => {
			let config = LOAD.config();
			let curls = LOAD.library("curls");
			curls.post(`${config.wxapp.api.login}?appid=${config.wxapp.appid}&secret=${config.wxapp.secret}&js_code=${data.code}&grant_type=authorization_code`, res => {
				if ( res.errcode ) return api_error(4101,res);
				let redis = LOAD.redis();
				redis.hget("newhand", res.openid, resnewhand => {
					resnewhand = resnewhand ? 1 : 0;
					redis.hset("user_session_key",res.openid,res.session_key);
					redis.hget("user", res.openid, user => {
						//当缓存存在用户时触发登录
						if ( user ) {
							redis.hset("user",res.openid,user);
							rlog("login", {
								openid : res.openid
							} );
							redis.get("setting", setting => {
								setting = setting || {};
								return api_success( {
									openid : res.openid,
									oauth : parseInt(user.oauth),
									info : user,
									setting : setting,
									newhand_state : resnewhand
								} );
							} );
						}
						//当缓存不存在用户时触发注册
						else {
							user = {
								id : 0,
								openid : res.openid,
								tel : "",
								nick : "",
								headimg : "",
								sex : 0,
								country : "",
								province : "",
								city : "",
								viptime : 0,
								viptype : 0,
								recharge : 0,
								oauth : 0
							};
							redis.hset("user",res.openid,user);
							rlog("regist", {
								openid : res.openid
							} );
							redis.get("setting", setting => {
								setting = setting || {};
								if( setting.system_close == 1 ){
									return api_success( {
										openid : res.openid,
										oauth : parseInt(user.oauth),
										info : user,
										setting : setting,
										newhand_state : resnewhand
									} );
								}
								else{
									//测试人员
									this.redis.hget("usertest", res.openid, resusertest => {
										if( !resusertest ) return api_error(10001);
										return api_success( {
											openid : res.openid,
											oauth : parseInt(user.oauth),
											info : user,
											setting : setting,
											newhand_state : resnewhand
										} );
									} );
								}
							} );
						}
					} );
				} );
			} );
		} ) ) end("Param Error!");
	}
	//设置用户信息
	setInfo() {
		if ( !post(data => {
			if ( !data.openid ) return api_error(5001);
			let redis = LOAD.redis();
			redis.hget("user_session_key", data.openid, session_key => {
				if ( !session_key ) return api_error(5004);
				let signature = LOAD.library("sha1").en(data.rawData + session_key);
				if ( signature != data.signature ) return api_error(5004);
				let info = this._decrypt(data.encryptedData,session_key,data.iv);
				if ( !info ) return api_error(5004);
				redis.hget("user", data.openid, user => {
					if ( !user ) return api_error(5006);
					user.id = parseInt(user.id);
					user.unionid = info.unionId;
					user.nick = delslashes(data.info.nickName);
					user.headimg = data.info.avatarUrl;
					user.sex = parseInt(data.info.gender);
					user.country = delslashes(data.info.country);
					user.province = delslashes(data.info.province);
					user.city = delslashes(data.info.city);
					user.viptime = parseInt(user.viptime);
					user.viptype = parseInt(user.viptype);
					user.recharge = parseInt(user.recharge);
					user.oauth = 1;
					redis.hset("user",data.openid,user);
					rlog("setUserInfo", {
						openid : data.openid,
						unionid : info.unionId,
						info : data.info
					} );
					api_success(user);
				} );
			} );
		} ) ) end("Param Error!");
	}
	//参数解密
	_decrypt(data,key,iv) {
		key = new Buffer(key,"base64");
		iv = new Buffer(iv,"base64");
		data = new Buffer(data,"base64");
		let crypto = require("crypto");
		let decipher = crypto.createDecipheriv("aes-128-cbc",key,iv);
		decipher.setAutoPadding(true)
	    let decoded = decipher.update(data,"binary","utf8");
	    decoded += decipher.final("utf8");
	    decoded = JSON.parse(decoded);
	    return decoded;
	}
}();