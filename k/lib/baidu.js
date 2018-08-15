const CURLS = LOAD.library("curls");
const CONFIG = LOAD.config();
class Baidu {
	getToken(fn) {
		let redis = LOAD.redis("wechat");
		redis.hget("baidu", CONFIG.baidu.name, token => {
			if ( !token || time() - token.time > token.expires_in - 86400 ) CURLS.post(CONFIG.baidu.api.token, res => {
				if ( res.access_token ) {
					res.time = time();
					redis.hset("baidu",CONFIG.baidu.name,res);
					fn(res);
				}
			} );
			else fn(token);
		} );
	}
	spam(chat,fn) {
		this.getToken(token => {
			CURLS.post(CONFIG.baidu.api.spam + "?access_token=" + token.access_token, {
				content : chat
			}, res => {
				if ( res.result && res.result.spam == 0 ) fn( {
					status : 1
				} );
				else if ( res.result && res.result.spam > 0 ) fn( {
					status : 0,
					spam : res.result.spam
				} );
				else fn( {
					status : 1,
					spam : -1
				} );
			} );
		} );
	}
}
module.exports = Baidu;