const CONFIG = require("./conf/config");
const MIMES = require("./conf/mimes");
const FS = require("fs");
const URL = require("url");
const OPTIONS = {
	key : "",
	cert : "",
	ca : ""
};
if ( HTTPS.status || SOCKETS.status ) {
	OPTIONS.key = FS.readFileSync("/usr/local/keys/key.key");
	OPTIONS.cert = FS.readFileSync("/usr/local/keys/public.pem");
	OPTIONS.ca = FS.readFileSync("/usr/local/keys/chain.pem");
}
if ( SERVER ) {
	const CONFIGSERVER = require("./conf/server");
	for ( let [name,server] of entries(CONFIGSERVER) ) {
		let C = require(`../c/${server.catalog}${server.controller}`);
		setTimeout( () => {
			if ( server.param ) {
				let param = '"' + server.param.join('","') + '"';
				eval(`C[server.method](${param});`);
			}
			else C[server.method]();
		}, server.delay );
	}
}
if ( HTTP.status ) {
	const APP = require("http").createServer( (req,res) => {
		let url = URL.parse(req.url);
		let path = url.pathname.split("/");
		path.shift();
		let fname = path[path.length - 1].split(".");
		let ext = fname.length < 2 ? "" : fname[1];
		path[path.length - 1] = fname[0];
		let contentType = MIMES[ext] ? MIMES[ext] : "text/html";
		contentType = typeof contentType == "string" ? contentType : contentType[0];
		res.writeHead( 200, {
			"Content-Type" : contentType,
			"Access-Control-Allow-Origin" : "*"
			// "Access-Control-Allow-Origin" : "https://fronts.edisonluorui.com"
		} );
		req.get = new Object();
		if ( url.query ) {
			for ( let [i,one] of url.query.split("&").entries() ) {
				req.get[one.substr(0,one.indexOf("="))] = one.substr(one.indexOf("=") + 1);
			}
		}
		res.jsonp = jsonp_encode;
		global.REQ = req;
		global.RES = res;
		if ( new RegExp(CONFIG.rewriteCond).test(req.url) ) FS.readFile(req.url.substr(1), (err,data) => {
			res.end(data);
		} );
		else {
			let checkSuffix = false;
			for ( let [i,name] of CONFIG.suffix.entries() ) {
				if ( name == ext ) {
					checkSuffix = true;
					break;
				}
			}
			if ( !checkSuffix ) return show_404();
			let cPath = "c/";
			let classname = "";
			let methodname = "";
			let c = null;
			function parseURI() {
				if ( path.length == 0 ) return init();
				let one = path.shift();
				if ( one == "" ) one = "index";
				if ( !classname ) FS.access(`${cPath}${one}.js`, FS.constants.R_OK, err => {
					if ( err ) FS.access(`${cPath}${one}/`, FS.constants.R_OK, err => {
						if ( err ) return init();
						else {
							cPath += `${one}/`;
							return parseURI();
						}
					} );
					else {
						classname = one;
						c = require(`../${cPath}${one}`);
						return parseURI();
					}
				} );
				if ( classname && !methodname ) {
					if ( one.left(1,"") != "_" && typeof c[one] == "function" ) methodname = one;
					else {
						methodname = "index";
						path.unshift(one);
					}
					return init();
				}
			}
			parseURI();
			function init() {
				if ( !classname ) return show_404();
				if ( !methodname ) methodname = "index";
				if ( typeof c[methodname] != "function" ) return show_404();
				let param = path.length == 0 ? "" : '"' + path.join('","') + '"';
				eval(`c[methodname](${param});`);
			}
		}
	} ).listen(HTTP.port);
}
if ( HTTPS.status ) {
	const APPS = require("https").createServer(OPTIONS, (req,res) => {
		let url = URL.parse(req.url);
		let path = url.pathname.split("/");
		path.shift();
		let fname = path[path.length - 1].split(".");
		let ext = fname.length < 2 ? "" : fname[1];
		path[path.length - 1] = fname[0];
		let contentType = MIMES[ext] ? MIMES[ext] : "text/html";
		contentType = typeof contentType == "string" ? contentType : contentType[0];
		res.writeHead( 200, {
			"Content-Type" : contentType,
			"Access-Control-Allow-Origin" : "https://fronts.edisonluorui.com"
		} );
		req.get = new Object();
		if ( url.query ) {
			for ( let [i,one] of url.query.split("&").entries() ) {
				req.get[one.substr(0,one.indexOf("="))] = one.substr(one.indexOf("=") + 1);
			}
		}
		res.jsonp = jsonp_encode;
		global.REQ = req;
		global.RES = res;
		if ( new RegExp(CONFIG.rewriteCond).test(req.url) ) FS.readFile(req.url.substr(1), (err,data) => {
			res.end(data);
		} );
		else {
			let checkSuffix = false;
			for ( let [i,name] of CONFIG.suffix.entries() ) {
				if ( name == ext ) {
					checkSuffix = true;
					break;
				}
			}
			if ( !checkSuffix ) return show_404();
			let cPath = "c/";
			let classname = "";
			let methodname = "";
			let c = null;
			function parseURI() {
				if ( path.length == 0 ) return init();
				let one = path.shift();
				if ( one == "" ) one = "index";
				if ( !classname ) FS.access(`${cPath}${one}.js`, FS.constants.R_OK, err => {
					if ( err ) FS.access(`${cPath}${one}/`, FS.constants.R_OK, err => {
						if ( err ) return init();
						else {
							cPath += `${one}/`;
							return parseURI();
						}
					} );
					else {
						classname = one;
						c = require(`../${cPath}${one}`);
						return parseURI();
					}
				} );
				if ( classname && !methodname ) {
					if ( typeof c[one] == "function" ) methodname = one;
					else {
						methodname = "index";
						path.unshift(one);
					}
					return init();
				}
			}
			parseURI();
			function init() {
				if ( !classname ) return show_404();
				if ( !methodname ) methodname = "index";
				if ( typeof c[methodname] != "function" ) return show_404();
				let param = path.length == 0 ? "" : '"' + path.join('","') + '"';
				eval(`c[methodname](${param});`);
			}
		}
	} ).listen(HTTPS.port);
}
if ( SOCKET.status ) {
	const APPSO = require("http").createServer( (req,res) => {
		let url = URL.parse(req.url);
		let path = url.pathname.split("/");
		path.shift();
		if ( path.length == 0 ) return res.end("404 not found");
		let fname = path[path.length - 1].split(".");
		let ext = fname.length < 2 ? "" : fname[1];
		path[path.length - 1] = fname[0];
		let contentType = MIMES[ext] ? MIMES[ext] : "text/html";
		contentType = typeof contentType == "string" ? contentType : contentType[0];
		res.writeHead( 200, {
			"Content-Type" : contentType,
			"Access-Control-Allow-Origin" : "*"
			// "Access-Control-Allow-Origin" : "https://fronts.edisonluorui.com"
		} );
		req.get = new Object();
		if ( url.query ) {
			for ( let [i,one] of url.query.split("&").entries() ) {
				req.get[one.substr(0,one.indexOf("="))] = one.substr(one.indexOf("=") + 1);
			}
		}
		res.jsonp = jsonp_encode;
		global.REQ = req;
		global.RES = res;
		if ( new RegExp(CONFIG.rewriteCond).test(req.url) ) FS.readFile(req.url.substr(1), (err,data) => {
			res.end(data);
		} );
		else {
			let checkSuffix = false;
			for ( let [i,name] of CONFIG.suffix.entries() ) {
				if ( name == ext ) {
					checkSuffix = true;
					break;
				}
			}
			if ( !checkSuffix ) return show_404();
			let cPath = "c/";
			let classname = "";
			let methodname = "";
			let c = null;
			function parseURI() {
				if ( path.length == 0 ) return init();
				let one = path.shift();
				if ( one == "" ) one = "index";
				if ( !classname ) FS.access(`${cPath}${one}.js`, FS.constants.R_OK, err => {
					if ( err ) FS.access(`${cPath}${one}/`, FS.constants.R_OK, err => {
						if ( err ) return init();
						else {
							cPath += `${one}/`;
							return parseURI();
						}
					} );
					else {
						classname = one;
						c = require(`../${cPath}${one}`);
						return parseURI();
					}
				} );
				if ( classname && !methodname ) {
					if ( one.left(1,"") != "_" && typeof c[one] == "function" ) methodname = one;
					else {
						methodname = "index";
						path.unshift(one);
					}
					return init();
				}
			}
			parseURI();
			function init() {
				if ( !classname ) return show_404();
				if ( !methodname ) methodname = "index";
				if ( typeof c[methodname] != "function" ) return show_404();
				let param = path.length == 0 ? "" : '"' + path.join('","') + '"';
				eval(`c[methodname](${param});`);
			}
		}
	} );
	const IO = require("socket.io")(APPSO);
	APPSO.listen(SOCKET.port);
	//let c = require("../c/socket");
	IO.on("connection", socket => {
		// if ( !new RegExp(CONFIG.socket_allow).test(socket.handshake.headers.referer) ) {
		// 	socket.send("You do not have permission to connect!");
		// 	socket.disconnect();
		// 	return console.log(`Deny to ${socket.handshake.headers.referer}`);
		// }
		/*c.io = IO;
		c.sockets = IO.sockets.sockets;
		c.rooms = IO.sockets.adapter.rooms;
		c.connection.call(c,socket);
		socket.on("message", data => {
			c.recieve.call(c,socket,data);
		} );
		socket.on("disconnect", () => {
			c.disconnect.call(c,socket);
		} );*/
	} );
}
if ( SOCKETS.status ) {
	const APPSOS = require("https").createServer(OPTIONS, (req,res) => {
		let url = URL.parse(req.url);
		let path = url.pathname.split("/");
		path.shift();
		let fname = path[path.length - 1].split(".");
		let ext = fname.length < 2 ? "" : fname[1];
		path[path.length - 1] = fname[0];
		let contentType = MIMES[ext] ? MIMES[ext] : "text/html";
		contentType = typeof contentType == "string" ? contentType : contentType[0];
		res.writeHead( 200, {
			"Content-Type" : contentType,
			"Access-Control-Allow-Origin" : "https://vgame.edisonluorui.com"
		} );
		req.get = new Object();
		if ( url.query ) {
			for ( let [i,one] of url.query.split("&").entries() ) {
				req.get[one.substr(0,one.indexOf("="))] = one.substr(one.indexOf("=") + 1);
			}
		}
		res.jsonp = jsonp_encode;
		global.REQ = req;
		global.RES = res;
		if ( new RegExp(CONFIG.rewriteCond).test(req.url) ) FS.readFile(req.url.substr(1), (err,data) => {
			res.end(data);
		} );
		else {
			let checkSuffix = false;
			for ( let [i,name] of CONFIG.suffix.entries() ) {
				if ( name == ext ) {
					checkSuffix = true;
					break;
				}
			}
			if ( !checkSuffix ) return show_404();
			let cPath = "c/";
			let classname = "";
			let methodname = "";
			let c = null;
			function parseURI() {
				if ( path.length == 0 ) return init();
				let one = path.shift();
				if ( one == "" ) one = "index";
				if ( !classname ) FS.access(`${cPath}${one}.js`, FS.constants.R_OK, err => {
					if ( err ) FS.access(`${cPath}${one}/`, FS.constants.R_OK, err => {
						if ( err ) return init();
						else {
							cPath += `${one}/`;
							return parseURI();
						}
					} );
					else {
						classname = one;
						c = require(`../${cPath}${one}`);
						return parseURI();
					}
				} );
				if ( classname && !methodname ) {
					if ( typeof c[one] == "function" ) methodname = one;
					else {
						methodname = "index";
						path.unshift(one);
					}
					return init();
				}
			}
			parseURI();
			function init() {
				if ( !classname ) return show_404();
				if ( !methodname ) methodname = "index";
				if ( typeof c[methodname] != "function" ) return show_404();
				let param = path.length == 0 ? "" : '"' + path.join('","') + '"';
				eval(`c[methodname](${param});`);
			}
		}
	} );
	const IOS = require("socket.io")(APPSOS);
	APPSOS.listen(SOCKETS.port);
	//let c = require("../c/socket");
	IOS.on("connection", socket => {
		// if ( !new RegExp(CONFIG.socket_allow).test(socket.handshake.headers.referer) ) {
		// 	socket.send("You do not have permission to connect!");
		// 	socket.disconnect();
		// 	return console.log(`Deny to ${socket.handshake.headers.referer}`);
		// }
		/*c.io = IOS;
		c.sockets = IOS.sockets.sockets;
		c.rooms = IOS.sockets.adapter.rooms;
		c.connection.call(c,socket);
		socket.on("message", data => {
			c.recieve.call(c,socket,data);
		} );
		socket.on("disconnect", () => {
			c.disconnect.call(c,socket);
		} );*/
	} );
}