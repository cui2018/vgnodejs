class Wx {
	getToken(fn) {
		let redis = LOAD.redis("wechat");
		let config = LOAD.config();
		let token = {};
		redis.hget("wechat", "vgame", wx => {
			if ( wx && ( time() - wx.timestamp < 60 ) ) {
				token.timestamp = wx.timestamp || 0;
				token.access_token = wx.access_token || "";
				token.state = 1;
				if ( fn ) fn(token);
			}
			else LOAD.library("curls").get("https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=" + config.wxapp.appid + "&secret=" + config.wxapp.secret, token => {
				if ( token.access_token ) {
					token.timestamp = time();
					token.state = 1;
					redis.hset("wechat","vgame",token);
					if ( fn ) fn(token);
				}
				else if ( fn ) fn( {
					state : 0
				} );
			} );
		} );
	}
}
module.exports = Wx;