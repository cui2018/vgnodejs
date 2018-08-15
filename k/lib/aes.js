const CRYPTO = require("crypto");
class Aes {
	setCipher(cipher) {
		Aes.cipher = cipher;
		return cipher;
	}
	setMode(mode) {
		Aes.mode = mode;
		return mode;
	}
	setKey(key = randex()) {
		Aes.key = key;
		return key;
	}
	setIV(iv = randex()) {
		Aes.iv = iv;
		return iv;
	}
	en(msg,key = Aes.key,iv = Aes.iv) {
		let aes = `aes-${Aes.cipher}-${Aes.mode}`;
		let cipher = CRYPTO.createCipheriv(aes,key,iv);
		if ( typeof msg == "object" ) msg = JSON.stringify(msg);
		return cipher.update(msg,"utf8","base64") + cipher.final("base64");
	}
	de(msg,key = Aes.key,iv = Aes.iv) {
		let aes = `aes-${Aes.cipher}-${Aes.mode}`;
		let decipher = CRYPTO.createDecipheriv(aes,key,iv);
		let decrypt = decipher.update(msg,"base64","utf8") + decipher.final("utf8");
		if ( decrypt.isJSON() ) decrypt = JSON.parse(decrypt);
		return decrypt;
	}
	sha1(key,str) {
		return CRYPTO.createHmac("sha1",key).update(str).digest().toString("base64");
	}
}
const CONFIG = require(`../conf/config`);
Aes.cipher = CONFIG.crypt.aes.cipher;
Aes.mode = CONFIG.crypt.aes.mode;
Aes.key = CONFIG.crypt.aes.key;
Aes.iv = CONFIG.crypt.aes.iv;
module.exports = Aes;