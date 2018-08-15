const CONFIG = require(`../conf/${ONLINE ? '' : 'local/'}redis`);
class RedisClass {
	constructor() {
		this.config = CONFIG["default"];
	}
	use(name = "default") {
		if ( !CONFIG[name] ) name = "default";
		this.config = CONFIG[name];
		if ( !this.redis ) this.redis = require('redis');
		if ( !this.client ) {
			this.client = this.redis.createClient(this.config.port,this.config.hostname);
			if ( this.config.password ) this.client.auth(this.config.password);
			this.client.on("ready", res => {
				//log(name + " redis is ready!");
			} );
			this.client.on("error", err => {
				log(`Redis.connect is error:${err}`);
			} );
		}
		return this;
	}
	prefix(name) {
		return this.config.prefix + name;
	}
	ready(fn) {
		this.client.on("ready", res => {
			fn(res);
		} );
	}
	set(name,value = "",fn) {
		if ( typeof name != "string" ) return this;
		name = this.prefix(name);
		value = typeof value == "object" ? JSON.stringify(value) : value;
		this.client.set(name, value, (err,res) => {
			if ( err ) log(`Redis.set.${name} is error:${err}`);
			else if ( fn ) fn(value);
		} );
		return this;
	}
	get(name,fn) {
		if ( !fn ) return this;
		if ( typeof name == "string" ) {
			this.client.get(this.prefix(name), (err,value) => {
				if ( err ) log(`Redis.get.${name} is error:${err}`);
				else fn(value == null ? null : (value.isJSON() ? JSON.parse(value) : value));
			} );
			return this;
		}
		if ( typeof name != "object" ) return log("Redis.get.names must be array!");
		let data = new Object();
		for ( let [key,item] of name.entries() ) {
			this.client.get(this.prefix(item), (err,value) => {
				if ( err ) {
					log(`Redis.get.${item} is error:${err}`);
					data[item] = null;
				}
				else {
					data[item] = value == null ? null : (value.isJSON() ? JSON.parse(value) : value);
					if ( Object.getOwnPropertyNames(data).length == name.length ) fn(data);
				}
			} );
		}
		return this;
	}
	del(name,fn) {
		if ( typeof name == "string" ) name = [name];
		if ( typeof name != "object" ) return log("Redis.del.names must be array!");
		let data = new Object();
		for ( let [key,item] of name.entries() ) {
			this.client.del(this.prefix(item), (err,res) => {
				if ( err ) {
					log(`Redis.del.${item} is error:${err}`);
					data[item] = null;
				}
				else {
					data[item] = 1;
					if ( fn && Object.getOwnPropertyNames(data).length == name.length ) fn();
				}
			} );
		}
		return this;
	}
	hset(name,key,value = "",fn) {
		if ( typeof name != "string" ) return this;
		name = this.prefix(name);
		value = typeof value == "object" ? JSON.stringify(value) : value;
		this.client.hset(name, key, value, (err,res) => {
			if ( err ) log(`Redis.hset.${name} is error:${err}`);
			else if ( fn ) fn(value);
		} );
		return this;
	}
	hget(name,key,fn) {
		if ( !fn || typeof name != "string" ) return this;
		this.client.hget(this.prefix(name), key, (err,value) => {
			if ( err ) log(`Redis.hget.${name} is error:${err}`);
			else fn(value == null ? null : (value.isJSON() ? JSON.parse(value) : value));
		} );
		return this;
	}
	hdel(name,key,fn) {
		if ( typeof name != "string" ) return this;
		this.client.hdel(this.prefix(name), key, (err,res) => {
			if ( err ) log(`Redis.hdel.${name} is error:${err}`);
			else if ( fn ) fn();
		} );
		return this;
	}
	hkeys(name,fn) {
		if ( !fn || typeof name != "string" ) return this;
		this.client.hkeys(this.prefix(name), (err,value) => {
			if ( err ) log(`Redis.hkeys.${name} is error:${err}`);
			else fn(value);
		} );
		return this;
	}

	hlen(name,fn){
		if ( !fn || typeof name != "string" ) return this;
		this.client.hlen(this.prefix(name), (err,value) => {
			if ( err ) log(`Redis.hkeys.${name} is error:${err}`);
			else fn(value);
		} );
		return this;
	}

	hexists(name,key,fn) {
		if ( !fn || typeof name != "string" ) return this;
		this.client.hexists(this.prefix(name),key,(err,value) => {
			if ( err ) log(`Redis.hexists.${name} is error:${err}`);
			else fn(value);
		} );
		return this;
	}

	keys(name,fn){
		if(!fn||typeof name != "string") return this;
		this.client.keys(this.prefix(name), (err,value) => {
			if ( err ) log(`Redis.keys.${name} is error:${err}`);
			else fn(value);
		});
		return this;
	}

	expire(name,time,fn){
		if(typeof name != "string") return this;
		this.client.expire(this.prefix(name), time,(err,value) => {
			if ( err ) log(`Redis.keys.${name} is error:${err}`);
			else if(fn) fn(value);
		});
		return this;
	}

	hgetall(name,fn) {
		if ( !fn || typeof name != "string" ) return this;
		this.hkeys(name, list => {
			let data = new Object();
			let getOne = function(list) {
				if ( list.length == 0 ) fn(data);
				else {
					let one = list.shift();
					this.hget(name, one, onedata => {
						data[one] = onedata;
						getOne.call(this,list);
					} );
				}
			}
			getOne.call(this,list);
		} );
		return this;
	}

	hgetallvalue(name,fn) {
		if ( !fn || typeof name != "string" ) return this;
		this.hkeys(name, list => {
			let data = new Array();
			let getOne = function(list) {
				if ( list.length == 0 ) fn(data);
				else {
					let one = list.shift();
					this.hget(name, one, onedata => {
						data.push(onedata);
						getOne.call(this,list);
					} );
				}
			}
			getOne.call(this,list);
		} );
		return this;
	}
	hgetallvalueback(name,fn) {
		if ( !fn || typeof name != "string" ) return this;
		this.hkeys(name, list => {
			if (!list) fn(false);
			list = list.reverse();
			let data = new Array();
			let getOne = function(list) {
				if ( list.length == 0 ) fn(data);
				else {
					let one = list.shift();
					this.hget(name, one, onedata => {
						data.push(onedata);
						getOne.call(this,list);
					} );
				}
			}
			getOne.call(this,list);
		} );
		return this;
	}
	hmset(name,values = new Object(),fn) {
		if ( typeof name != "string" ) return this;
		name = this.prefix(name);
		this.client.hmset(name, values, (err,res) => {
			if ( err ) log(`Redis.hmset.${name} is error:${err}`);
			else if ( fn ) fn(values);
		} );
		return this;
	}
	hmget(name,keys,fn) {
		if ( !fn || typeof name != "string" ) return this;
		this.client.hmget(this.prefix(name), keys, (err,value) => {
			if ( err ) log(`Redis.hmget.${name} is error:${err}`);
			else fn(value);
		} );
		return this;
	}
	hmdel(name,keys,fn) {
		if ( typeof name != "string" ) return this;
		if ( typeof keys != "object" ) return log("Redis.hmdel.keys must be array!");
		let data = new Object();
		for ( let [key,item] of keys.entries() ) {
			this.hdel(name, item, (err,res) => {
				if ( err ) {
					log(`Redis.hmdel.${name}.${item} is error:${err}`);
					data[item] = null;
				}
				else {
					data[item] = 1;
					if ( fn && Object.getOwnPropertyNames(data).length == keys.length ) fn();
				}
			} );
		}
		return this;
	}
	lpush(name,obj,fn) {
		if ( typeof name != "string" ) return this;
		name = this.prefix(name);
		let json = JSON.stringify(obj);
		this.client.lpush(name, json, (err,res) => {
			if ( err ) log(`Redis.lpush.${name} is error:${err}`);
			else if ( fn ) fn(res,obj);
		} );
		return this;
	}
	rpush(name,obj,fn) {
		if ( typeof name != "string" ) return this;
		name = this.prefix(name);
		let json = JSON.stringify(obj);
		this.client.rpush(name, json, (err,res) => {
			if ( err ) log(`Redis.rpush.${name} is error:${err}`);
			else if ( fn ) fn(res,obj);
		} );
		return this;
	}
	lrange(name,from,to,fn) {
		if ( typeof from == "function" ) {
			fn = from;
			from = 0;
			to = -1;
		}
		else if ( typeof to == "function" ) {
			fn = to;
			to = -1;
		}
		if ( !fn || typeof name != "string" ) return this;
		this.client.lrange(this.prefix(name), from, to, (err,list) => {
			if ( err ) log(`Redis.lrange.${name} is error:${err}`);
			else {
				for ( let [key,item] of list.entries() ) {
					list[key] = item == null ? null : (item.isJSON() ? JSON.parse(item) : item);
				}
				fn(list);
			}
		} );
		return this;
	}
	llen(name,fn) {
		if ( !fn || typeof name != "string" ) return this;
		this.client.llen(this.prefix(name), (err,len) => {
			if ( err ) log(`Redis.llen.${name} is error:${err}`);
			else fn(len);
		} );
		return this;
	}
	lpop(name,fn) {
		if ( typeof name != "string" ) return this;
		name = this.prefix(name);
		this.client.lpop(name, (err,one) => {
			if ( err ) log(`Redis.lpop.${name} is error:${err}`);
			else if ( fn ) fn(one == null ? null : (one.isJSON() ? JSON.parse(one) : one));
		} );
		return this;
	}
	rpop(name,fn) {
		if ( typeof name != "string" ) return this;
		name = this.prefix(name);
		this.client.rpop(name, (err,one) => {
			if ( err ) log(`Redis.rpop.${name} is error:${err}`);
			else if ( fn ) fn(one == null ? null : (one.isJSON() ? JSON.parse(one) : one));
		} );
		return this;
	}

	sadd(name,value = "",fn) {
		if ( typeof name != "string" ) return this;
		name = this.prefix(name);
		value = typeof value == "object" ? JSON.stringify(value) : value;
		this.client.sadd(name, value, (err,res) => {
			if ( err ) log(`Redis.set.${name} is error:${err}`);
			else if ( fn ) fn(value);
		} );
		return this;
	}
	smembers(name, fn) {
		if ( !fn || typeof name != "string" ) return this;
		this.client.smembers(this.prefix(name), (err,list) => {
			if ( err ) log(`Redis.smembers.${name} is error:${err}`);
			else {
				for ( let [key,item] of list.entries() ) {
					list[key] = item == null ? null : (item.isJSON() ? JSON.parse(item) : item);
				}
				fn(list);
			}
		} );
		return this;
	}
	scard(name,fn){
		if ( !fn || typeof name != "string" ) return this;
		this.client.scard(this.prefix(name), (err,value) => {
			if ( err ) log(`Redis.smembers.${name} is error:${err}`);
			else fn(value);
		} );
		return this;
	}
	
	quit() {
		this.client.quit();
		return this;
	}
}
module.exports = RedisClass;