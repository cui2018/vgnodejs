class Load {
	static config(name = "config") {
		if ( this.configs.hasOwnProperty(name) ) return this.configs[name];
		let config = require(`./conf/${name}`);
		this.configs[name] = config;
		return config;
	}
	static mysql(name = "default",conn = false) {
		if ( !conn && this.mysqls.hasOwnProperty(name) ) return this.mysqls[name].use(name,conn);
		const MYSQLCLASS = require("./lib/database-mysql");
		const MYSQL = new MYSQLCLASS;
		let mysql = MYSQL.use(name,conn);
		this.mysqls[name] = mysql;
		return mysql;
	}
	static redis(name = "default") {
		if ( this.redises.hasOwnProperty(name) ) return this.redises[name];
		const REDISCLASS = require("./lib/redis");
		const REDIS = new REDISCLASS;
		let redis = REDIS.use(name);
		this.redises[name] = redis;
		return redis;
	}
	static library(name = "") {
		if ( !name ) return false;
		if ( this.libraries.hasOwnProperty(name) ) return this.libraries[name];
		const THECLASS = require(`./lib/${name}`);
		const THE = new THECLASS;
		this.libraries[name] = THE;
		return THE;
	}
	static ftp(name = "default") {
		if ( this.ftps.hasOwnProperty(name) ) return this.ftps[name];
		const FTPCLASS = require("./lib/ftp");
		const FTP = new FTPCLASS;
		let ftp = FTP.use(name);
		this.ftps[name] = ftp;
		return ftp;
	}
}
Load.configs = new Object();
Load.mysqls = new Object();
Load.redises = new Object();
Load.libraries = new Object();
Load.ftps = new Object();
module.exports = Load;