const CRYPTO = require("crypto");
class Md5 {
	en(str) {
		let md5 = CRYPTO.createHash("md5");
		md5.update(str);
		str = md5.digest("hex");
		return str.toLowerCase();
	}
	up(str){
		let md5 = CRYPTO.createHash("md5");
		md5.update(str);
		str = md5.digest("hex");
		return str.toUpperCase();
	}
}
module.exports = Md5;