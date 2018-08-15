const CRYPTO = require("crypto");
class Sha1 {
	en(str) {
		let sha1 = CRYPTO.createHash("sha1");
		sha1.update(str);
		str = sha1.digest("hex");
		return str.toLowerCase();
	}
	up(str){
		let sha1 = CRYPTO.createHash("sha1");
		sha1.update(str);
		str = sha1.digest("hex");
		return str.toUpperCase();
	}
}
module.exports = Sha1;