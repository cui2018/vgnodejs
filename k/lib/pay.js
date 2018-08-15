const XML = LOAD.library("xml");
const MD5 = LOAD.library("md5");
const CURLS = LOAD.library("curls");
const CONFIG = LOAD.config();
const S = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
class Pay {
	wx(name = "wechat") {
		let config = CONFIG[name];
		return {
			createOrder : (data,fn) => {
				let out_trade_no = newOrderId();
				let ip = remoteAddr();
				let param = this.sign( {
					appid : config.appid,
					mch_id : config.mchid,
					nonce_str : this.nonce(),
					body : config.body,
					detail : data.desc,
					attach : data.desc,
					out_trade_no : out_trade_no,
					total_fee : data.money * 100,
					notify_url : config.notify,
					spbill_create_ip : ip,
					trade_type : "JSAPI",
					openid : data.openid
				}, config.key );
				let xml = XML.encode(param);
				CURLS.post("https://api.mch.weixin.qq.com/pay/unifiedorder", xml, res => {
					XML.decode(res, result => {
						if ( result.xml.return_code == "SUCCESS" && result.xml.result_code == "SUCCESS" ) {
							let res = this.sign( {
								appId : config.appid,
								timeStamp : time().toString(),
								nonceStr : this.nonce(),
								package : "prepay_id=" + result.xml.prepay_id,
								signType : "MD5"
							}, config.key );
							fn(out_trade_no,res);
						}
						else return api_error(5201);
					} );
				} );
			},
			notify : (data,fn) => {
				if ( !this.checkSign(data,config.key) ) return this.fail("签名错误");
				fn(data.out_trade_no);
				this.success();
			}
		};
	}
	nonce() {
		let nonce_str = "";
		for ( let i = 0; i < 16; i++ ) {
			nonce_str += S.substr(rand(0,S.length - 1),1).toString();
		}
		return nonce_str;
	}
	sign(param,key) {
		let keys = Object.keys(param);
		keys.sort((a,b) => a < b ? -1 : 1);
		let params = [];
		for ( let [i,key] of keys.entries() ) {
			params.push(key + "=" + param[key]);
		}
		let sign = params.join("&");
		sign += `&key=${key}`;
		param.sign = MD5.up(sign);
		return param;
	}
	checkSign(param,key) {
		let signature = param.sign;
		delete param.sign;
		let keys = Object.keys(param);
		keys.sort((a,b) => a < b ? -1 : 1);
		let params = [];
		for ( let [i,key] of keys.entries() ) {
			params.push(key + "=" + param[key]);
		}
		let sign = params.join("&");
		sign += `&key=${key}`;
		sign = MD5.up(sign);
		return sign == signature;
	}
	success() {
		end( XML.encode( {
			return_code : "SUCCESS",
			return_msg : "OK"
		} ) );
	}
	fail(msg) {
		end( XML.encode( {
			return_code : "FAIL",
			return_msg : msg
		} ) );
	}
}
module.exports = Pay;