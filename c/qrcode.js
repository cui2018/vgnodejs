const CURLS = LOAD.library("curls");
const FTP = LOAD.ftp();
const FS = require("fs");
const UUID = require("uuid");
module.exports = new class extends Controller {
	constructor() {
		super();
		this.redis = LOAD.redis();
	}
	//获取二维码
	index(){
		if(!post(data => {
			if( !data.openid ) return api_error(5012); 
			else this._getqrcodephp(data);
		} ) )end("Param Error!");
	}
	//收集formid
	userformid(){
		if(!post(data => {
			if( !data.openid ) return api_success();
			if( typeof data.formid != "undefined" && data.formid != '' && data.formid != "the formId is a mock one") rlog("addModelformid", {
				openid : data.openid,
				formid : data.formid
			} );
			return api_success();
		} ) )end("Param Error!");
	}
	//获取二维码
	_getqrcodephp(data) {
		this.redis.hget("user", data.openid, resuser => {
			this.redis.hget("qrcode", data.openid, resqrcode => {
				if( !resqrcode ) CURLS.post("https://vgame-gm.edisonluorui.com/qrcode", {
					scene : resuser.id,
					page : "pages/index/index"
				}, res => {
					this.redis.hset("qrcode", data.openid, res);
					return api_success(res);
				} )
				else return api_success(resqrcode);
			} );
		} );
	}
	//获取二维码(废弃)
	_getqrcodenode(data){
		LOAD.library("wx").getToken( token => {
			if ( token.state==1 ){
				this.redis.hget("qrcodeById", data.openid + "-" + data.gameid, uuid => {
					if ( !uuid ) {
						let uuid2 = UUID.v1().replace(/-/g,"");
						CURLS.post("https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token="+token.access_token, JSON.stringify({
							scene : uuid2,
							page : "pages/index/index"
						}),filedata => {
							let fname = newOrderId() + ".png";
							FS.writeFile("tmp/" + fname, filedata, e => {
								FTP.ready( e => {
									FTP.upload("tmp/" + fname, "/upload/qrcode/" + fname, err => {
										FTP.end();
										FS.unlink("tmp/" + fname);
										this.redis.hset("qrcodeById",data.openid + "-" + data.gameid,uuid2);
										this.redis.hset("qrcodeByUUID", uuid2, {
											openid : data.openid,
											gameid : data.gameid,
											url : fname
										} );
										return api_success({
											fname: fname,
											filedata: filedata
										});
									} );
								} );
							} );
						});
					}else {
						this.redis.hget("qrcodeByUUID", uuid, info => {
							return api_success(info.url);
						} );
					}
				} );
			}else {
				return api_error("5009");
			}
		} );
	}
	//用户踩链接
	getInfo() {
		if(!post(data => {
			this.redis.hget("qrcodeByUUID", data.uuid, info => {
				return api_success({
					openid : info.openid,
					gameid : info.gameid
				});
			} );
		} ) )end("Param Error!");
	}
}();
