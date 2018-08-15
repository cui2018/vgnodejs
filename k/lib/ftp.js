const CONFIG = require(`../conf/${ONLINE ? '' : 'local/'}ftp`);
const FTP = require("ftp");
class FTPClass {
	constructor() {
		this.config = CONFIG["default"];
	}
	use(name = "default") {
		if ( !CONFIG[name] ) name = "default";
		this.config = CONFIG[name];
		this.isReady = false;
		this.onReady = null;
		if ( !this.ftp ) {
			this.ftp = [];
			this.config.recursion((i,item,next) => {
				this.ftp.push(new FTP());
				this.ftp[i].connect(item);
				this.ftp[i].on("ready", e => {
					next();
				} );
			}, over => {
				this.isReady = true;
				if ( this.onReady ) this.onReady();
			} );
		}
		return this;
	}
	ready(fn) {
		if ( this.isReady ) fn();
		else this.onReady = fn;
	}
	mkdir(path,fn) {
		let errs = [];
		this.ftp.recursion((i,ftp,next) => {
			ftp.mkdir(path, err => {
				errs.push(err);
				next();
			} );
		}, over => {
			fn(errs);
		} );
	}
	upload(local,server,fn) {
		let errs = [];
		this.ftp.recursion((i,ftp,next) => {
			ftp.put(local, server, err => {
				errs.push(err);
				next();
			} );
		}, over => {
			fn(errs);
		} );
	}
	end() {
		for ( let [i,ftp] of this.ftp.entries() ) {
			ftp.end();
		}
	}
}
module.exports = FTPClass;